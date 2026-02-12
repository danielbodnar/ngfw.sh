# ngfw-www

Marketing landing page for [ngfw.sh](https://ngfw.sh) — deployed as a Cloudflare Worker serving a React SPA.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4 |
| Build | Vite 7 |
| Icons | Lucide React |
| Deploy | Cloudflare Workers (SPA mode) |

## Routes

The Worker serves `ngfw.sh` and `www.ngfw.sh` via custom domain routes. SPA fallback is enabled — all paths resolve to `index.html` for client-side navigation.

## Sections

The page is a single-file React app (`src/App.tsx`) with these sections:

| Section | Description |
|---------|-------------|
| Header | Fixed nav with mobile hamburger menu |
| Hero | Headline, CTAs, dashboard preview |
| Stats | Threat count, uptime, DNS latency, user count |
| Features | 6 cards: firewall, DNS filtering, VPN, IDS, analytics, fleet mgmt |
| Pricing | 4 tiers (Starter/Pro/Business/Business Plus) with monthly/annual toggle |
| Hardware | 3 router models (BR100, BR200, BR400 Pro) with specs |
| FAQ | 6 expandable Q&A items |
| Footer | Product/Company/Legal/Support links |

## External Links

- `app.ngfw.sh` — Portal dashboard (sign in, get started)
- `docs.ngfw.sh` — Documentation
- `specs.ngfw.sh` — API reference

## Development

```sh
bun run dev        # Vite dev server with hot reload
bun run build      # Production build to dist/
bun run preview    # Preview production build locally
bun run deploy     # Build + wrangler deploy
```

## Configuration

Worker config lives in `wrangler.toml`:

- **Observability:** Enabled at 100% sampling (logs + traces)
- **Assets:** Served from `./dist` with SPA not-found handling
- **Domains:** `ngfw.sh`, `www.ngfw.sh`

## License

MIT
