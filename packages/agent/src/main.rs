//! NGFW.sh Router Agent
//!
//! Thin-client daemon for asuswrt-merlin routers. Connects to the cloud API
//! via WebSocket, receives configuration and commands, reports telemetry,
//! and manages router subsystems.

mod collector;
mod config;
mod connection;
mod dispatcher;
mod mode;

use config::AgentConfig;
use tracing::{error, info};

#[tokio::main]
async fn main() {
    // Parse CLI args
    let args: Vec<String> = std::env::args().collect();
    let config_path = args
        .iter()
        .position(|a| a == "--config")
        .and_then(|i| args.get(i + 1))
        .map(|s| s.as_str())
        .unwrap_or("/jffs/ngfw/config.toml");

    let daemon_mode = args.iter().any(|a| a == "--daemon");
    let check_mode = args.iter().any(|a| a == "--check");

    // Load configuration
    let config = match AgentConfig::load(config_path).await {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to load config from {}: {}", config_path, e);
            std::process::exit(1);
        }
    };

    if check_mode {
        println!("Configuration OK:");
        println!("  device_id: {}", config.agent.device_id);
        println!("  websocket_url: {}", config.agent.websocket_url);
        println!(
            "  api_key: {}...",
            &config.agent.api_key[..8.min(config.agent.api_key.len())]
        );
        println!("  log_level: {:?}", config.agent.log_level);
        println!(
            "  metrics_interval: {}s",
            config.agent.metrics_interval_secs
        );
        println!("  mode: {}", config.mode.default);
        return;
    }

    // Initialize tracing
    let log_level = config.agent.log_level.as_deref().unwrap_or("info");
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(log_level)),
        )
        .with_target(false)
        .init();

    info!(
        "ngfw-agent {} starting (device_id={})",
        env!("CARGO_PKG_VERSION"),
        config.agent.device_id
    );

    // Write PID file
    if daemon_mode {
        let pid = std::process::id();
        if let Err(e) = tokio::fs::write("/tmp/ngfw-agent.pid", pid.to_string()).await {
            error!("Failed to write PID file: {}", e);
        }
    }

    // Run the agent
    if let Err(e) = run(config).await {
        error!("Agent exited with error: {}", e);
        std::process::exit(1);
    }
}

async fn run(config: AgentConfig) -> Result<(), Box<dyn std::error::Error>> {
    let (outbound_tx, outbound_rx) = tokio::sync::mpsc::channel(256);
    let (inbound_tx, inbound_rx) = tokio::sync::mpsc::channel(256);
    let (mode_tx, mode_rx) = tokio::sync::watch::channel(mode::load_persisted_mode().await);
    let shutdown = tokio::sync::watch::channel(false);

    // Spawn connection loop
    let conn_config = config.clone();
    let conn_shutdown = shutdown.1.clone();
    let conn_handle = tokio::spawn(connection::connection_loop(
        conn_config,
        outbound_rx,
        inbound_tx,
        conn_shutdown,
    ));

    // Spawn dispatcher
    let disp_config = config.clone();
    let disp_outbound = outbound_tx.clone();
    let disp_mode_tx = mode_tx.clone();
    let disp_mode_rx = mode_rx.clone();
    let disp_shutdown = shutdown.1.clone();
    let disp_handle = tokio::spawn(dispatcher::dispatcher_loop(
        disp_config,
        inbound_rx,
        disp_outbound,
        disp_mode_tx,
        disp_mode_rx,
        disp_shutdown,
    ));

    // Spawn metrics collector
    let coll_config = config.clone();
    let coll_outbound = outbound_tx.clone();
    let coll_shutdown = shutdown.1.clone();
    let coll_handle = tokio::spawn(collector::metrics_loop(
        coll_config,
        coll_outbound,
        coll_shutdown,
    ));

    // Wait for shutdown signal
    let shutdown_tx = shutdown.0;
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            info!("Received SIGINT, shutting down...");
        }
        _ = async {
            #[cfg(unix)]
            {
                let mut sigterm = tokio::signal::unix::signal(
                    tokio::signal::unix::SignalKind::terminate()
                ).expect("failed to register SIGTERM");
                sigterm.recv().await;
            }
            #[cfg(not(unix))]
            {
                std::future::pending::<()>().await;
            }
        } => {
            info!("Received SIGTERM, shutting down...");
        }
    }

    // Signal all tasks to stop
    let _ = shutdown_tx.send(true);

    // Wait for tasks to finish
    let _ = tokio::join!(conn_handle, disp_handle, coll_handle);

    // Cleanup PID file
    let _ = tokio::fs::remove_file("/tmp/ngfw-agent.pid").await;

    info!("ngfw-agent stopped");
    Ok(())
}
