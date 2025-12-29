# Portal Agent Guide

## Build & Dev Commands
- `bun install` - Install dependencies
- `bun run dev` - Start Vite dev server
- `bun run build` - Build for production
- `bun run deploy` - Build and deploy to Cloudflare Workers

## Code Style

### TypeScript
- Strict mode enabled with `noUncheckedIndexedAccess`
- Use `type` for type aliases, `interface` for object shapes
- Prefer explicit return types on exported functions

### React Patterns
- Functional components only, no class components
- Use `useState`, `useMemo`, `useEffect` from React
- Component props: inline types for small, separate interface for complex
- Utility function `cn()` for conditional class names: `cn('base', condition && 'class')`

### Imports & Formatting
- Group: React first, then external libs (lucide-react), then local
- Single quotes, no semicolons (Vite default)
- 2-space indentation

### Naming
- PascalCase: Components, Types (`Dashboard`, `NavItem`)
- camelCase: functions, variables (`formatBytes`, `systemStats`)
- Descriptive names over abbreviations
