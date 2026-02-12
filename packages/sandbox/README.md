# ngfw-sandbox

Cloud-hosted development environment for the ngfw.sh monorepo, running on Cloudflare Sandbox containers with a browser-based terminal.

## Stack

| Layer | Technology |
|-------|-----------|
| Worker | Hono 4 on Cloudflare Workers |
| Container | Cloudflare Sandbox 0.7.1 (Ubuntu) |
| Terminal | xterm.js 5 with WebGL renderer |
| Editor | Neovim + lazy.nvim (LSP, Treesitter, Telescope) |
| Multiplexer | Zellij with Catppuccin Mocha theme |
| Languages | Rust (stable + wasm32 target), Bun |
| Tools | ripgrep, fd, fzf, jq, shellcheck |

## Architecture

```
Browser (xterm.js)
    │
    ▼ WebSocket
Cloudflare Worker (Hono)
    │
    ▼ Sandbox SDK
Container (Ubuntu + Neovim + Zellij)
    ├── PTY shell (zsh)
    ├── Dev servers (schema, portal, www, docs)
    └── ngfw.sh monorepo clone
```

The Worker uses a Durable Object to maintain a persistent sandbox instance (standard-1: 2 vCPU, 2 GB RAM, up to 3 concurrent instances).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Terminal UI (inline HTML + xterm.js) |
| `GET` | `/ws/terminal` | WebSocket PTY with configurable cols/rows |
| `POST` | `/api/exec` | Execute shell command (JSON: `{ cmd, cwd? }`) |
| `GET` | `/api/status` | Health check |
| `POST` | `/api/setup` | Clone/pull ngfw.sh repo + `bun install` |
| `POST` | `/api/dev/:service` | Start dev server (schema, portal, www, docs) |
| `GET` | `/api/processes` | List running processes |
| `DELETE` | `/api/processes/:id` | Kill process by ID |
| `ALL` | `/preview/*` | Proxy to container dev server ports |

## Container Tooling

The Dockerfile provisions a full development environment:

- **Neovim** with lazy.nvim, Mason (LSP), Treesitter parsers for TS/Rust/Lua/Astro/Vue/HTML/CSS/JSON/TOML/YAML/Bash/Markdown
- **Zellij** with a two-tab layout (editor + terminal) and a services tab
- **Rust** toolchain with `wasm32-unknown-unknown` and `aarch64-unknown-linux-gnu` targets
- **Bun** runtime for TypeScript/JavaScript
- **Ghostty terminfo** for correct terminal rendering over WebSocket PTY

## Terminal Features

- WebSocket-based PTY with binary message support
- Auto-reconnect with 3-second retry on disconnect
- Status indicator (connecting / connected / disconnected)
- Zellij auto-launches on PTY connection

## Development

```sh
bun run dev        # wrangler dev on port 8800
bun run deploy     # Build + deploy Worker + container
bun run typecheck  # TypeScript validation
```

## Configuration

Worker config lives in `wrangler.jsonc`:

- **Container:** Dockerfile-based, standard-1 instance, max 3
- **Durable Object:** `Sandbox` class with SQLite storage
- **Observability:** Enabled at 100% sampling

## License

MIT
