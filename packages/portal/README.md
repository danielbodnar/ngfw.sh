# NGFW.sh Portal

Web dashboard for NGFW.sh firewall management, built with React and Vite.

**Live site**: [ngfw.sh](https://ngfw.sh)

## Features

- Real-time system monitoring (CPU, memory, temperature)
- Network configuration (WAN, LAN, VLANs, WiFi)
- Firewall rule management with zone-based policies
- Traffic logs with filtering and search
- DNS filtering with blocklist management
- VPN server peer management
- User authentication via Clerk.com (email/password, phone, OAuth, MFA, passkeys)
- Billing and subscription management

## Development

```bash
# Install dependencies
bun install

# Start dev server at localhost:5173
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Deployment

```bash
# Build and deploy to Cloudflare Workers
bun run deploy
```

This deploys to `ngfw.sh`.

## Project Structure

```
portal/
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/
│   └── favicon.svg      # Site favicon
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── wrangler.toml        # Cloudflare Workers config
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite 7 | Build tool and dev server |
| Tailwind CSS 4 | Utility-first CSS |
| TypeScript 5 | Type safety |
| Lucide React | Icon library |

## Code Style

### TypeScript

- Strict mode with `noUncheckedIndexedAccess`
- Use `type` for type aliases, `interface` for object shapes
- Explicit return types on exported functions

### React Patterns

- Functional components only
- Hooks: `useState`, `useMemo`, `useEffect`
- Utility function `cn()` for conditional class names

### Formatting

- Single quotes, no semicolons
- 2-space indentation
- Import order: React, external libs, local

## Component Examples

### Using the `cn` utility

```tsx
const cn = (...classes: (string | boolean | undefined)[]) => 
  classes.filter(Boolean).join(' ');

<button className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-emerald-500',
  disabled && 'opacity-50'
)}>
  Click me
</button>
```

### Creating a Card component

```tsx
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
    <div className="px-4 py-3 border-b border-zinc-800">
      <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);
```

## Configuration

### Vite Config (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
  },
})
```

### Wrangler Config (`wrangler.toml`)

The portal is deployed as a static site to Cloudflare Workers.
