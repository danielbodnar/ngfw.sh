import { getSandbox, proxyTerminal, proxyToSandbox, type Sandbox } from "@cloudflare/sandbox";
import { Hono } from "hono";

export { Sandbox } from "@cloudflare/sandbox";

type Env = {
	Sandbox: DurableObjectNamespace<Sandbox>;
};

const app = new Hono<{ Bindings: Env }>();

const SANDBOX_ID = "ngfw-dev";

// Serve the terminal UI at the root
app.get("/", async (c) => {
	const html = TERMINAL_HTML;
	return c.html(html);
});

// WebSocket PTY terminal endpoint
app.get("/ws/terminal", async (c) => {
	const upgradeHeader = c.req.header("Upgrade");
	if (upgradeHeader?.toLowerCase() !== "websocket") {
		return c.text("Expected WebSocket upgrade", 426);
	}

	const sandbox = getSandbox(c.env.Sandbox, SANDBOX_ID);
	const url = new URL(c.req.url);
	const cols = parseInt(url.searchParams.get("cols") || "120");
	const rows = parseInt(url.searchParams.get("rows") || "30");

	return proxyTerminal(sandbox, SANDBOX_ID, c.req.raw, { cols, rows });
});

// API: Execute a command in the sandbox
app.post("/api/exec", async (c) => {
	const sandbox = getSandbox(c.env.Sandbox, SANDBOX_ID);
	const body = await c.req.json<{ command: string; cwd?: string }>();
	const result = await sandbox.exec(body.command, { cwd: body.cwd });
	return c.json(result);
});

// API: Health check / sandbox status
app.get("/api/status", async (c) => {
	const sandbox = getSandbox(c.env.Sandbox, SANDBOX_ID);
	const result = await sandbox.exec("echo ok");
	return c.json({
		sandbox: SANDBOX_ID,
		healthy: result.success,
		exitCode: result.exitCode,
	});
});

// API: Clone the repo into the sandbox workspace
app.post("/api/setup", async (c) => {
	const sandbox = getSandbox(c.env.Sandbox, SANDBOX_ID);
	const body = await c.req.json<{ repo?: string; branch?: string }>().catch((): { repo?: string; branch?: string } => ({}));
	const repo = body.repo || "https://github.com/danielbodnar/ngfw.sh.git";
	const branch = body.branch || "main";

	// Clone or pull
	const check = await sandbox.exec("test -d /workspace/.git && echo exists || echo missing");
	if (check.stdout.trim() === "exists") {
		const pull = await sandbox.exec(`git pull origin ${branch}`, { cwd: "/workspace" });
		return c.json({ action: "pull", ...pull });
	}

	const clone = await sandbox.exec(
		`git clone --branch ${branch} ${repo} /workspace`,
		{ timeout: 120_000 }
	);

	if (clone.success) {
		// Install dependencies
		await sandbox.exec("bun install", { cwd: "/workspace", timeout: 120_000 });
	}

	return c.json({ action: "clone", ...clone });
});

// API: Start dev servers
app.post("/api/dev/:service", async (c) => {
	const sandbox = getSandbox(c.env.Sandbox, SANDBOX_ID);
	const service = c.req.param("service");

	const commands: Record<string, string> = {
		schema: "bun run dev:schema",
		portal: "bun run dev:portal",
		www: "bun run dev:www",
		docs: "bun run dev:docs",
	};

	const cmd = commands[service];
	if (!cmd) {
		return c.json({ error: `Unknown service: ${service}` }, 400);
	}

	const process = await sandbox.startProcess(cmd, {
		cwd: "/workspace",
		processId: `dev-${service}`,
	});

	return c.json({
		service,
		processId: process.id,
		pid: process.pid,
		status: process.status,
	});
});

// API: List running processes
app.get("/api/processes", async (c) => {
	const sandbox = getSandbox(c.env.Sandbox, SANDBOX_ID);
	const processes = await sandbox.listProcesses();
	return c.json(processes);
});

// API: Kill a process
app.delete("/api/processes/:id", async (c) => {
	const sandbox = getSandbox(c.env.Sandbox, SANDBOX_ID);
	const id = c.req.param("id");
	await sandbox.killProcess(id);
	return c.json({ killed: id });
});

// Proxy preview URLs for exposed ports
app.all("/preview/*", async (c) => {
	const response = await proxyToSandbox(c.req.raw, c.env);
	return response ?? c.text("Sandbox not found", 404);
});

export default app;

// Inline the terminal HTML so we don't need a separate static asset pipeline.
// This is replaced by the actual HTML content at build time via wrangler's
// define mechanism, or served as a raw string.
const TERMINAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ngfw.sh — sandbox</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5/css/xterm.min.css">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; background: #1e1e2e; color: #cdd6f4; font-family: system-ui, sans-serif; }
  #app { display: flex; flex-direction: column; height: 100%; }
  #toolbar {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 16px; background: #181825; border-bottom: 1px solid #313244;
    font-size: 13px; flex-shrink: 0;
  }
  #toolbar .title { font-weight: 600; color: #89b4fa; }
  #toolbar .status { margin-left: auto; display: flex; align-items: center; gap: 6px; }
  #toolbar .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #f38ba8; transition: background 0.3s;
  }
  #toolbar .dot.connected { background: #a6e3a1; }
  #toolbar .dot.connecting { background: #f9e2af; }
  #toolbar button {
    background: #313244; color: #cdd6f4; border: 1px solid #45475a;
    padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;
  }
  #toolbar button:hover { background: #45475a; }
  #terminal-container { flex: 1; padding: 4px; overflow: hidden; }
  .xterm { height: 100%; }
</style>
</head>
<body>
<div id="app">
  <div id="toolbar">
    <span class="title">ngfw.sh sandbox</span>
    <button id="btn-setup" title="Clone repo and install deps">setup repo</button>
    <button id="btn-reconnect" title="Reconnect terminal">reconnect</button>
    <span class="status">
      <span class="dot" id="status-dot"></span>
      <span id="status-text">disconnected</span>
    </span>
  </div>
  <div id="terminal-container"></div>
</div>

<script type="module">
import { Terminal } from "https://cdn.jsdelivr.net/npm/@xterm/xterm@5/+esm";
import { FitAddon } from "https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0/+esm";
import { WebLinksAddon } from "https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0/+esm";
import { WebglAddon } from "https://cdn.jsdelivr.net/npm/@xterm/addon-webgl@0/+esm";

const SANDBOX_ID = "ngfw-dev";

const term = new Terminal({
  cursorBlink: true,
  cursorStyle: "bar",
  fontSize: 14,
  fontFamily: '"Ghostty", "JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  theme: {
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    cursor: "#f5e0dc",
    selectionBackground: "#585b70",
    black: "#45475a",
    red: "#f38ba8",
    green: "#a6e3a1",
    yellow: "#f9e2af",
    blue: "#89b4fa",
    magenta: "#f5c2e7",
    cyan: "#94e2d5",
    white: "#bac2de",
    brightBlack: "#585b70",
    brightRed: "#f38ba8",
    brightGreen: "#a6e3a1",
    brightYellow: "#f9e2af",
    brightBlue: "#89b4fa",
    brightMagenta: "#f5c2e7",
    brightCyan: "#94e2d5",
    brightWhite: "#a6adc8",
  },
  allowProposedApi: true,
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.loadAddon(new WebLinksAddon());

const container = document.getElementById("terminal-container");
term.open(container);

// Try WebGL renderer for performance; fall back silently
try {
  term.loadAddon(new WebglAddon());
} catch (_) {}

fitAddon.fit();

const dot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

function setStatus(state) {
  dot.className = "dot " + state;
  statusText.textContent = state;
}

let ws;
let reconnectTimer;

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }
  setStatus("connecting");

  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const cols = term.cols;
  const rows = term.rows;
  ws = new WebSocket(proto + "//" + location.host + "/ws/terminal?id=" + SANDBOX_ID + "&cols=" + cols + "&rows=" + rows);
  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    setStatus("connected");
    clearTimeout(reconnectTimer);
  };

  ws.onmessage = (event) => {
    if (typeof event.data === "string") {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "ready") {
          setStatus("connected");
        } else if (msg.type === "exit") {
          term.writeln("\\r\\n[Process exited with code " + msg.code + "]");
          setStatus("disconnected");
        } else if (msg.type === "error") {
          term.writeln("\\r\\n[Error: " + msg.message + "]");
        }
      } catch (_) {
        term.write(event.data);
      }
    } else {
      term.write(new Uint8Array(event.data));
    }
  };

  ws.onclose = () => {
    setStatus("disconnected");
    reconnectTimer = setTimeout(connect, 3000);
  };

  ws.onerror = () => {
    setStatus("disconnected");
    ws.close();
  };
}

// Send terminal input to the sandbox PTY
term.onData((data) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(new TextEncoder().encode(data));
  }
});

// Handle terminal resize
term.onResize(({ cols, rows }) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "resize", cols, rows }));
  }
});

window.addEventListener("resize", () => fitAddon.fit());
new ResizeObserver(() => fitAddon.fit()).observe(container);

// Toolbar buttons
document.getElementById("btn-reconnect").addEventListener("click", () => {
  if (ws) ws.close();
  clearTimeout(reconnectTimer);
  connect();
});

document.getElementById("btn-setup").addEventListener("click", async () => {
  term.writeln("\\r\\n[Setting up repository...]");
  try {
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    term.writeln("[Setup " + data.action + ": " + (data.success ? "success" : "failed") + "]");
    if (data.stdout) term.writeln(data.stdout);
    if (data.stderr) term.writeln(data.stderr);
  } catch (err) {
    term.writeln("[Setup error: " + err.message + "]");
  }
});

// Initial connection
connect();
</script>
</body>
</html>`;
