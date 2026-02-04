//! Message dispatcher — routes inbound RPC messages to the correct handler
//!
//! Receives `RpcMessage` from the connection loop via an mpsc channel,
//! matches on `msg_type`, enforces mode restrictions, and sends response
//! messages back through the outbound channel.

use std::time::Instant;

use ngfw_protocol::{
    AgentMode, ConfigAck, ConfigPush, ConfigSection, ExecCommand, ExecResult, MessageType,
    ModeAckPayload, ModeConfig, ModeUpdatePayload, RpcMessage, StatusPayload, UpgradeCommand,
};
use tokio::sync::{mpsc, watch};
use tracing::{debug, error, info, warn};

use crate::config::AgentConfig;
use crate::mode;

/// Commands the agent is permitted to execute, even in takeover mode.
/// Any command not in this list is rejected outright.
const ALLOWED_COMMANDS: &[&str] = &[
    "iptables",
    "iptables-save",
    "iptables-restore",
    "ip",
    "ifconfig",
    "brctl",
    "nvram",
    "wl",
    "service",
    "dnsmasq",
    "cat",
    "ls",
    "df",
    "free",
    "uptime",
    "uname",
    "ping",
    "traceroute",
    "nslookup",
];

/// Read-only diagnostic commands allowed in shadow mode
const DIAGNOSTIC_COMMANDS: &[&str] = &[
    "cat",
    "ls",
    "df",
    "free",
    "uptime",
    "uname",
    "ping",
    "traceroute",
    "nslookup",
    "iptables-save",
    "ip",
    "ifconfig",
    "nvram",
    "wl",
];

/// Main dispatcher loop. Runs until inbound channel closes or shutdown fires.
pub async fn dispatcher_loop(
    config: AgentConfig,
    mut inbound_rx: mpsc::Receiver<RpcMessage>,
    outbound_tx: mpsc::Sender<RpcMessage>,
    mode_tx: watch::Sender<ModeConfig>,
    mode_rx: watch::Receiver<ModeConfig>,
    mut shutdown: watch::Receiver<bool>,
) {
    info!("Dispatcher started");

    loop {
        tokio::select! {
            biased;

            _ = shutdown.changed() => {
                if *shutdown.borrow() {
                    info!("Dispatcher shutting down");
                    return;
                }
            }

            msg = inbound_rx.recv() => {
                let msg = match msg {
                    Some(m) => m,
                    None => {
                        info!("Inbound channel closed, dispatcher exiting");
                        return;
                    }
                };

                debug!(msg_type = ?msg.msg_type, id = %msg.id, "Dispatching message");

                let current_mode = mode_rx.borrow().clone();

                let response = match msg.msg_type {
                    MessageType::ConfigPush | MessageType::ConfigFull => {
                        handle_config(&config, &msg, &current_mode).await
                    }
                    MessageType::Exec => {
                        handle_exec(&msg, &current_mode).await
                    }
                    MessageType::StatusRequest => {
                        handle_status_request(&config, &msg).await
                    }
                    MessageType::Ping => {
                        handle_ping(&msg)
                    }
                    MessageType::Reboot => {
                        handle_reboot(&msg, &current_mode, &shutdown).await
                    }
                    MessageType::Upgrade => {
                        handle_upgrade(&msg, &current_mode).await
                    }
                    MessageType::ModeUpdate => {
                        handle_mode_update(&msg, &mode_tx).await
                    }
                    other => {
                        debug!(msg_type = ?other, "Ignoring unhandled message type");
                        None
                    }
                };

                if let Some(resp) = response
                    && let Err(e) = outbound_tx.send(resp).await
                {
                    error!("Failed to send response on outbound channel: {}", e);
                    return;
                }
            }
        }
    }
}

/// Handle ConfigPush / ConfigFull based on current mode
async fn handle_config(
    config: &AgentConfig,
    msg: &RpcMessage,
    mode_config: &ModeConfig,
) -> Option<RpcMessage> {
    let push: ConfigPush = match serde_json::from_value(msg.payload.clone()) {
        Ok(p) => p,
        Err(e) => {
            warn!(id = %msg.id, "Invalid ConfigPush payload: {}", e);
            return Some(config_fail_response(
                &msg.id,
                ConfigSection::Full,
                0,
                e.to_string(),
            ));
        }
    };

    let section = &push.section;
    let effective = mode_config.effective_mode(section);

    match effective {
        AgentMode::Observe => {
            info!(
                section = ?section,
                version = push.version,
                "Observe mode — config received but not applied"
            );
            Some(config_ack_response(&msg.id, push.section, push.version))
        }

        AgentMode::Shadow => {
            info!(
                section = ?section,
                version = push.version,
                "Shadow mode — validating config (no apply)"
            );

            // Validate the config structure
            match validate_config(config, &push) {
                Ok(()) => {
                    info!(section = ?section, "Shadow validation passed");
                    Some(config_ack_response(&msg.id, push.section, push.version))
                }
                Err(e) => {
                    warn!(section = ?section, "Shadow validation failed: {}", e);
                    Some(config_fail_response(&msg.id, push.section, push.version, e))
                }
            }
        }

        AgentMode::Takeover => {
            info!(
                section = ?section,
                version = push.version,
                "Takeover mode — applying config"
            );

            match apply_config(config, &push).await {
                Ok(()) => {
                    info!(section = ?section, version = push.version, "Config applied");
                    Some(config_ack_response(&msg.id, push.section, push.version))
                }
                Err(e) => {
                    error!(section = ?section, "Config apply failed: {}", e);
                    Some(config_fail_response(&msg.id, push.section, push.version, e))
                }
            }
        }
    }
}

/// Handle Exec commands with allowlist and mode enforcement
async fn handle_exec(msg: &RpcMessage, mode_config: &ModeConfig) -> Option<RpcMessage> {
    let cmd: ExecCommand = match serde_json::from_value(msg.payload.clone()) {
        Ok(c) => c,
        Err(e) => {
            warn!(id = %msg.id, "Invalid ExecCommand payload: {}", e);
            return Some(exec_error_response(&msg.id, "unknown", "invalid", e.to_string()));
        }
    };

    // Extract the base command (first token, strip path)
    let base_command = cmd
        .command
        .split('/')
        .next_back()
        .unwrap_or(&cmd.command)
        .split_whitespace()
        .next()
        .unwrap_or(&cmd.command);

    // Check allowlist
    if !ALLOWED_COMMANDS.contains(&base_command) {
        warn!(
            command = %cmd.command,
            command_id = %cmd.command_id,
            "Command not in allowlist"
        );
        return Some(exec_error_response(
            &msg.id,
            &cmd.command_id,
            "blocked",
            format!("Command '{}' is not in the allowlist", base_command),
        ));
    }

    // Check mode permissions
    let is_diagnostic = DIAGNOSTIC_COMMANDS.contains(&base_command);

    if !is_diagnostic && !mode::can_exec(mode_config) {
        warn!(
            command = %cmd.command,
            mode = ?mode_config.mode,
            "Exec denied — mode does not allow mutating commands"
        );
        return Some(exec_error_response(
            &msg.id,
            &cmd.command_id,
            "mode_denied",
            format!(
                "Command '{}' requires takeover mode (current: {:?})",
                base_command, mode_config.mode
            ),
        ));
    }

    if is_diagnostic && !mode::can_exec_diagnostics(mode_config) {
        warn!(
            command = %cmd.command,
            mode = ?mode_config.mode,
            "Diagnostic exec denied — observe mode"
        );
        return Some(exec_error_response(
            &msg.id,
            &cmd.command_id,
            "mode_denied",
            format!(
                "Diagnostics require at least shadow mode (current: {:?})",
                mode_config.mode
            ),
        ));
    }

    // Build the process
    let timeout_secs = cmd.timeout_secs.unwrap_or(30);
    let start = Instant::now();

    let mut process = tokio::process::Command::new(&cmd.command);
    if let Some(ref args) = cmd.args {
        process.args(args);
    }

    info!(
        command_id = %cmd.command_id,
        command = %cmd.command,
        args = ?cmd.args,
        timeout = timeout_secs,
        "Executing command"
    );

    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout_secs as u64),
        process.output(),
    )
    .await;

    let duration_ms = start.elapsed().as_millis() as u64;

    let exec_result = match result {
        Ok(Ok(output)) => ExecResult {
            command_id: cmd.command_id,
            exit_code: output.status.code().unwrap_or(-1),
            stdout: Some(String::from_utf8_lossy(&output.stdout).to_string()),
            stderr: Some(String::from_utf8_lossy(&output.stderr).to_string()),
            duration_ms,
        },
        Ok(Err(e)) => {
            error!(command = %cmd.command, "Process spawn failed: {}", e);
            ExecResult {
                command_id: cmd.command_id,
                exit_code: -1,
                stdout: None,
                stderr: Some(format!("Failed to execute: {}", e)),
                duration_ms,
            }
        }
        Err(_) => {
            warn!(command = %cmd.command, timeout = timeout_secs, "Command timed out");
            ExecResult {
                command_id: cmd.command_id,
                exit_code: -1,
                stdout: None,
                stderr: Some(format!("Command timed out after {}s", timeout_secs)),
                duration_ms,
            }
        }
    };

    let payload = match serde_json::to_value(&exec_result) {
        Ok(v) => v,
        Err(e) => {
            error!("Failed to serialize ExecResult: {}", e);
            return None;
        }
    };

    Some(RpcMessage::with_id(
        msg.id.clone(),
        MessageType::ExecResult,
        payload,
    ))
}

/// Handle StatusRequest — collect system metrics and reply
async fn handle_status_request(config: &AgentConfig, msg: &RpcMessage) -> Option<RpcMessage> {
    info!("Collecting system status");

    let status = collect_status(config).await;

    let payload = match serde_json::to_value(&status) {
        Ok(v) => v,
        Err(e) => {
            error!("Failed to serialize StatusPayload: {}", e);
            return None;
        }
    };

    Some(RpcMessage::with_id(
        msg.id.clone(),
        MessageType::Status,
        payload,
    ))
}

/// Handle Ping with a Pong
fn handle_ping(msg: &RpcMessage) -> Option<RpcMessage> {
    debug!("Ping received, sending Pong");
    Some(RpcMessage::with_id(
        msg.id.clone(),
        MessageType::Pong,
        serde_json::json!({}),
    ))
}

/// Handle Reboot — only allowed in takeover mode
async fn handle_reboot(
    msg: &RpcMessage,
    mode_config: &ModeConfig,
    shutdown: &watch::Receiver<bool>,
) -> Option<RpcMessage> {
    if mode_config.mode != AgentMode::Takeover {
        warn!(
            mode = ?mode_config.mode,
            "Reboot denied — requires takeover mode"
        );
        return Some(RpcMessage::with_id(
            msg.id.clone(),
            MessageType::Error,
            serde_json::json!({
                "error": format!("Reboot requires takeover mode (current: {:?})", mode_config.mode)
            }),
        ));
    }

    info!("Reboot requested — initiating graceful shutdown");

    // Acknowledge before rebooting
    let ack = RpcMessage::with_id(
        msg.id.clone(),
        MessageType::StatusOk,
        serde_json::json!({ "action": "reboot", "status": "initiated" }),
    );

    // Schedule the actual reboot after a short delay to allow the ack to send
    let _shutdown = shutdown.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        info!("Executing reboot");
        let result = tokio::process::Command::new("reboot").output().await;
        if let Err(e) = result {
            error!("Reboot command failed: {}", e);
        }
    });

    Some(ack)
}

/// Handle Upgrade — download firmware, verify checksum, replace binary, restart
async fn handle_upgrade(msg: &RpcMessage, mode_config: &ModeConfig) -> Option<RpcMessage> {
    if mode_config.mode != AgentMode::Takeover {
        warn!(
            mode = ?mode_config.mode,
            "Upgrade denied — requires takeover mode"
        );
        return Some(RpcMessage::with_id(
            msg.id.clone(),
            MessageType::Error,
            serde_json::json!({
                "error": format!("Upgrade requires takeover mode (current: {:?})", mode_config.mode)
            }),
        ));
    }

    let upgrade: UpgradeCommand = match serde_json::from_value(msg.payload.clone()) {
        Ok(u) => u,
        Err(e) => {
            warn!(id = %msg.id, "Invalid UpgradeCommand payload: {}", e);
            return Some(RpcMessage::with_id(
                msg.id.clone(),
                MessageType::Error,
                serde_json::json!({ "error": format!("Invalid upgrade payload: {}", e) }),
            ));
        }
    };

    info!(
        version = %upgrade.version,
        url = %upgrade.download_url,
        "Starting firmware upgrade"
    );

    // Download the upgrade binary
    let download_path = "/jffs/ngfw/ngfw-agent.new";

    let download_result = tokio::process::Command::new("curl")
        .args(["-fsSL", "-o", download_path, &upgrade.download_url])
        .output()
        .await;

    match download_result {
        Ok(output) if output.status.success() => {
            info!("Download complete, verifying checksum");
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("Download failed: {}", stderr);
            return Some(RpcMessage::with_id(
                msg.id.clone(),
                MessageType::Error,
                serde_json::json!({ "error": format!("Download failed: {}", stderr) }),
            ));
        }
        Err(e) => {
            error!("Failed to run curl: {}", e);
            return Some(RpcMessage::with_id(
                msg.id.clone(),
                MessageType::Error,
                serde_json::json!({ "error": format!("Download failed: {}", e) }),
            ));
        }
    }

    // Verify SHA256 checksum
    let checksum_result = tokio::process::Command::new("sha256sum")
        .arg(download_path)
        .output()
        .await;

    match checksum_result {
        Ok(output) if output.status.success() => {
            let actual = String::from_utf8_lossy(&output.stdout);
            let actual_hash = actual.split_whitespace().next().unwrap_or("");
            if actual_hash != upgrade.checksum {
                error!(
                    expected = %upgrade.checksum,
                    actual = %actual_hash,
                    "Checksum mismatch"
                );
                let _ = tokio::fs::remove_file(download_path).await;
                return Some(RpcMessage::with_id(
                    msg.id.clone(),
                    MessageType::Error,
                    serde_json::json!({
                        "error": format!(
                            "Checksum mismatch: expected {}, got {}",
                            upgrade.checksum, actual_hash
                        )
                    }),
                ));
            }
            info!("Checksum verified");
        }
        _ => {
            error!("Checksum verification failed");
            let _ = tokio::fs::remove_file(download_path).await;
            return Some(RpcMessage::with_id(
                msg.id.clone(),
                MessageType::Error,
                serde_json::json!({ "error": "Checksum verification failed" }),
            ));
        }
    }

    // Replace the running binary
    let current_exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => {
            error!("Cannot determine current executable path: {}", e);
            let _ = tokio::fs::remove_file(download_path).await;
            return Some(RpcMessage::with_id(
                msg.id.clone(),
                MessageType::Error,
                serde_json::json!({ "error": format!("Cannot find current binary: {}", e) }),
            ));
        }
    };

    // Make the new binary executable
    let _ = tokio::process::Command::new("chmod")
        .args(["+x", download_path])
        .output()
        .await;

    // Move new binary into place
    if let Err(e) = tokio::fs::rename(download_path, &current_exe).await {
        error!("Failed to replace binary: {}", e);
        let _ = tokio::fs::remove_file(download_path).await;
        return Some(RpcMessage::with_id(
            msg.id.clone(),
            MessageType::Error,
            serde_json::json!({ "error": format!("Failed to replace binary: {}", e) }),
        ));
    }

    info!(version = %upgrade.version, "Upgrade installed, restarting");

    // Acknowledge, then restart via service manager
    let ack = RpcMessage::with_id(
        msg.id.clone(),
        MessageType::StatusOk,
        serde_json::json!({
            "action": "upgrade",
            "version": upgrade.version,
            "status": "installed"
        }),
    );

    tokio::spawn(async {
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        info!("Restarting agent after upgrade");
        let result = tokio::process::Command::new("service")
            .args(["ngfw-agent", "restart"])
            .output()
            .await;
        if let Err(e) = result {
            error!("Service restart failed: {}", e);
            // Fallback: exit so the init system restarts us
            std::process::exit(0);
        }
    });

    Some(ack)
}

/// Handle ModeUpdate — persist new mode and broadcast via watch channel
async fn handle_mode_update(
    msg: &RpcMessage,
    mode_tx: &watch::Sender<ModeConfig>,
) -> Option<RpcMessage> {
    let update: ModeUpdatePayload = match serde_json::from_value(msg.payload.clone()) {
        Ok(u) => u,
        Err(e) => {
            warn!(id = %msg.id, "Invalid ModeUpdatePayload: {}", e);
            let ack = ModeAckPayload {
                success: false,
                mode_config: mode_tx.borrow().clone(),
                error: Some(format!("Invalid payload: {}", e)),
            };
            let payload = serde_json::to_value(&ack).ok()?;
            return Some(RpcMessage::with_id(
                msg.id.clone(),
                MessageType::ModeAck,
                payload,
            ));
        }
    };

    let new_config = update.mode_config;

    info!(
        mode = ?new_config.mode,
        overrides = ?new_config.section_overrides,
        "Mode update received"
    );

    // Persist to disk
    if let Err(e) = mode::persist_mode(&new_config).await {
        error!("Failed to persist mode: {}", e);
        let ack = ModeAckPayload {
            success: false,
            mode_config: mode_tx.borrow().clone(),
            error: Some(format!("Failed to persist: {}", e)),
        };
        let payload = serde_json::to_value(&ack).ok()?;
        return Some(RpcMessage::with_id(
            msg.id.clone(),
            MessageType::ModeAck,
            payload,
        ));
    }

    // Broadcast to all watchers
    if mode_tx.send(new_config.clone()).is_err() {
        error!("Mode watch channel closed");
    }

    info!(mode = ?new_config.mode, "Mode updated and persisted");

    let ack = ModeAckPayload {
        success: true,
        mode_config: new_config,
        error: None,
    };
    let payload = serde_json::to_value(&ack).ok()?;
    Some(RpcMessage::with_id(
        msg.id.clone(),
        MessageType::ModeAck,
        payload,
    ))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Build a ConfigAck response
fn config_ack_response(id: &str, section: ConfigSection, version: u64) -> RpcMessage {
    let ack = ConfigAck {
        section,
        version,
        success: true,
        error: None,
    };
    let payload = serde_json::to_value(&ack).unwrap_or_default();
    RpcMessage::with_id(id.to_string(), MessageType::ConfigAck, payload)
}

/// Build a ConfigFail response
fn config_fail_response(
    id: &str,
    section: ConfigSection,
    version: u64,
    error: String,
) -> RpcMessage {
    let ack = ConfigAck {
        section,
        version,
        success: false,
        error: Some(error),
    };
    let payload = serde_json::to_value(&ack).unwrap_or_default();
    RpcMessage::with_id(id.to_string(), MessageType::ConfigFail, payload)
}

/// Build an ExecResult error response, preserving the original message ID for correlation
fn exec_error_response(msg_id: &str, command_id: &str, _reason: &str, error: String) -> RpcMessage {
    let result = ExecResult {
        command_id: command_id.to_string(),
        exit_code: -1,
        stdout: None,
        stderr: Some(error),
        duration_ms: 0,
    };
    let payload = serde_json::to_value(&result).unwrap_or_default();
    RpcMessage::with_id(msg_id.to_string(), MessageType::ExecResult, payload)
}

/// Validate a config push without applying it (shadow mode)
fn validate_config(_config: &AgentConfig, push: &ConfigPush) -> Result<(), String> {
    // Verify the payload has the expected structure for the section
    if push.config.is_null() {
        return Err("Config payload is null".to_string());
    }

    // Section-specific structural validation
    match push.section {
        ConfigSection::Firewall => {
            if !push.config.is_object() {
                return Err("Firewall config must be an object".to_string());
            }
        }
        ConfigSection::Wan | ConfigSection::Lan => {
            if !push.config.is_object() {
                return Err(format!("{:?} config must be an object", push.section));
            }
        }
        ConfigSection::Dns => {
            if !push.config.is_object() {
                return Err("DNS config must be an object".to_string());
            }
        }
        ConfigSection::Full => {
            if !push.config.is_object() {
                return Err("Full config must be an object".to_string());
            }
        }
        _ => {
            // Accept any valid JSON for other sections
        }
    }

    Ok(())
}

/// Apply a config push to the router (takeover mode)
async fn apply_config(_config: &AgentConfig, push: &ConfigPush) -> Result<(), String> {
    // Validate first
    validate_config(_config, push)?;

    // TODO: Delegate to section-specific adapters (iptables, dnsmasq, nvram, etc.)
    // For now, log and acknowledge. The adapter layer will be implemented in
    // packages/agent/src/adapters/ with per-section modules.
    info!(
        section = ?push.section,
        version = push.version,
        "Config apply delegated to adapter (stub)"
    );

    Ok(())
}

/// Collect current system status from procfs and system commands
async fn collect_status(config: &AgentConfig) -> StatusPayload {
    let uptime = read_uptime().await;
    let (cpu, memory) = read_cpu_memory().await;
    let temperature = read_temperature().await;
    let load = read_loadavg().await;

    StatusPayload {
        uptime,
        cpu,
        memory,
        temperature,
        load,
        interfaces: vec![],
        connections: read_connection_count().await,
        wan_ip: read_wan_ip().await,
        firmware: config
            .agent
            .log_level
            .as_deref()
            .map(|_| "unknown".to_string())
            .unwrap_or_else(|| "unknown".to_string()),
    }
}

/// Read system uptime from /proc/uptime
async fn read_uptime() -> u64 {
    match tokio::fs::read_to_string("/proc/uptime").await {
        Ok(contents) => contents
            .split_whitespace()
            .next()
            .and_then(|s| s.parse::<f64>().ok())
            .map(|f| f as u64)
            .unwrap_or(0),
        Err(_) => 0,
    }
}

/// Read CPU and memory usage from /proc/meminfo
async fn read_cpu_memory() -> (f32, f32) {
    // Memory from /proc/meminfo
    let memory = match tokio::fs::read_to_string("/proc/meminfo").await {
        Ok(contents) => {
            let mut total: u64 = 0;
            let mut available: u64 = 0;
            for line in contents.lines() {
                if let Some(val) = line.strip_prefix("MemTotal:") {
                    total = val
                        .split_whitespace()
                        .next()
                        .and_then(|s| s.parse().ok())
                        .unwrap_or(0);
                } else if let Some(val) = line.strip_prefix("MemAvailable:") {
                    available = val
                        .split_whitespace()
                        .next()
                        .and_then(|s| s.parse().ok())
                        .unwrap_or(0);
                }
            }
            if total > 0 {
                ((total - available) as f32 / total as f32) * 100.0
            } else {
                0.0
            }
        }
        Err(_) => 0.0,
    };

    // CPU from /proc/stat (instantaneous — a proper implementation would sample over time)
    let cpu = match tokio::fs::read_to_string("/proc/stat").await {
        Ok(contents) => {
            if let Some(line) = contents.lines().next() {
                let parts: Vec<u64> = line
                    .split_whitespace()
                    .skip(1) // skip "cpu"
                    .filter_map(|s| s.parse().ok())
                    .collect();
                if parts.len() >= 4 {
                    let total: u64 = parts.iter().sum();
                    let idle = parts[3];
                    if total > 0 {
                        ((total - idle) as f32 / total as f32) * 100.0
                    } else {
                        0.0
                    }
                } else {
                    0.0
                }
            } else {
                0.0
            }
        }
        Err(_) => 0.0,
    };

    (cpu, memory)
}

/// Read CPU temperature from thermal zone
async fn read_temperature() -> Option<f32> {
    match tokio::fs::read_to_string("/sys/class/thermal/thermal_zone0/temp").await {
        Ok(contents) => contents.trim().parse::<f32>().ok().map(|t| t / 1000.0),
        Err(_) => None,
    }
}

/// Read load averages from /proc/loadavg
async fn read_loadavg() -> [f32; 3] {
    match tokio::fs::read_to_string("/proc/loadavg").await {
        Ok(contents) => {
            let parts: Vec<f32> = contents
                .split_whitespace()
                .take(3)
                .filter_map(|s| s.parse().ok())
                .collect();
            if parts.len() == 3 {
                [parts[0], parts[1], parts[2]]
            } else {
                [0.0, 0.0, 0.0]
            }
        }
        Err(_) => [0.0, 0.0, 0.0],
    }
}

/// Count active network connections from /proc/net/tcp + /proc/net/udp
async fn read_connection_count() -> u32 {
    let mut count: u32 = 0;
    for path in ["/proc/net/tcp", "/proc/net/udp"] {
        if let Ok(contents) = tokio::fs::read_to_string(path).await {
            // Subtract 1 for the header line
            count += contents.lines().count().saturating_sub(1) as u32;
        }
    }
    count
}

/// Try to read the WAN IP via ip command
async fn read_wan_ip() -> Option<String> {
    let output = tokio::process::Command::new("ip")
        .args(["route", "get", "1.1.1.1"])
        .output()
        .await
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Parse "... src 192.168.1.1 ..."
    stdout
        .split_whitespace()
        .zip(stdout.split_whitespace().skip(1))
        .find(|(key, _)| *key == "src")
        .map(|(_, ip)| ip.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use ngfw_protocol::{ConfigSection, MessageType};

    /// Helper to build a minimal AgentConfig for testing
    fn test_config() -> AgentConfig {
        toml::from_str(
            r#"
[agent]
device_id = "test-device"
api_key = "test-key"
"#,
        )
        .expect("test config should parse")
    }

    // -----------------------------------------------------------------------
    // validate_config tests
    // -----------------------------------------------------------------------

    #[test]
    fn validate_config_rejects_null_payload() {
        let config = test_config();
        let push = ConfigPush {
            section: ConfigSection::Firewall,
            config: serde_json::Value::Null,
            version: 1,
        };
        let result = validate_config(&config, &push);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Config payload is null");
    }

    #[test]
    fn validate_config_accepts_object_payload() {
        let config = test_config();
        let push = ConfigPush {
            section: ConfigSection::Firewall,
            config: serde_json::json!({ "rules": [] }),
            version: 1,
        };
        assert!(validate_config(&config, &push).is_ok());
    }

    #[test]
    fn validate_config_rejects_array_for_firewall() {
        let config = test_config();
        let push = ConfigPush {
            section: ConfigSection::Firewall,
            config: serde_json::json!([1, 2, 3]),
            version: 1,
        };
        let result = validate_config(&config, &push);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Firewall config must be an object");
    }

    #[test]
    fn validate_config_rejects_array_for_wan() {
        let config = test_config();
        let push = ConfigPush {
            section: ConfigSection::Wan,
            config: serde_json::json!([]),
            version: 1,
        };
        let result = validate_config(&config, &push);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("config must be an object"));
    }

    #[test]
    fn validate_config_rejects_array_for_dns() {
        let config = test_config();
        let push = ConfigPush {
            section: ConfigSection::Dns,
            config: serde_json::json!("string value"),
            version: 1,
        };
        let result = validate_config(&config, &push);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "DNS config must be an object");
    }

    #[test]
    fn validate_config_rejects_array_for_full() {
        let config = test_config();
        let push = ConfigPush {
            section: ConfigSection::Full,
            config: serde_json::json!(42),
            version: 1,
        };
        let result = validate_config(&config, &push);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Full config must be an object");
    }

    // -----------------------------------------------------------------------
    // config_ack_response tests
    // -----------------------------------------------------------------------

    #[test]
    fn config_ack_response_creates_correct_message() {
        let resp = config_ack_response("msg-123", ConfigSection::Firewall, 5);

        assert_eq!(resp.id, "msg-123");
        assert_eq!(resp.msg_type, MessageType::ConfigAck);

        let ack: ConfigAck =
            serde_json::from_value(resp.payload).expect("payload should deserialize");
        assert_eq!(ack.section, ConfigSection::Firewall);
        assert_eq!(ack.version, 5);
        assert!(ack.success);
        assert!(ack.error.is_none());
    }

    // -----------------------------------------------------------------------
    // config_fail_response tests
    // -----------------------------------------------------------------------

    #[test]
    fn config_fail_response_creates_correct_message() {
        let resp = config_fail_response(
            "msg-456",
            ConfigSection::Dns,
            3,
            "bad format".to_string(),
        );

        assert_eq!(resp.id, "msg-456");
        assert_eq!(resp.msg_type, MessageType::ConfigFail);

        let ack: ConfigAck =
            serde_json::from_value(resp.payload).expect("payload should deserialize");
        assert_eq!(ack.section, ConfigSection::Dns);
        assert_eq!(ack.version, 3);
        assert!(!ack.success);
        assert_eq!(ack.error.as_deref(), Some("bad format"));
    }

    // -----------------------------------------------------------------------
    // exec_error_response tests
    // -----------------------------------------------------------------------

    #[test]
    fn exec_error_response_uses_provided_msg_id() {
        let resp = exec_error_response(
            "msg-789",
            "cmd-001",
            "blocked",
            "not allowed".to_string(),
        );

        // The response must carry the original message ID, not a random UUID
        assert_eq!(resp.id, "msg-789");
        assert_eq!(resp.msg_type, MessageType::ExecResult);

        let result: ExecResult =
            serde_json::from_value(resp.payload).expect("payload should deserialize");
        assert_eq!(result.command_id, "cmd-001");
        assert_eq!(result.exit_code, -1);
        assert!(result.stdout.is_none());
        assert_eq!(result.stderr.as_deref(), Some("not allowed"));
        assert_eq!(result.duration_ms, 0);
    }

    #[test]
    fn exec_error_response_preserves_different_ids() {
        // Verify msg_id and command_id are independent
        let resp = exec_error_response(
            "original-msg",
            "exec-command-42",
            "mode_denied",
            "requires takeover".to_string(),
        );

        assert_eq!(resp.id, "original-msg");

        let result: ExecResult =
            serde_json::from_value(resp.payload).expect("payload should deserialize");
        assert_eq!(result.command_id, "exec-command-42");
    }
}
