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

## Authentication (Clerk.com)

### Environment Variables
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (set in `.dev.vars`)

### Clerk Components Used
```typescript
import {
  SignedIn,       // Render children only when authenticated
  SignedOut,      // Render children only when unauthenticated
  SignIn,         // Pre-built sign-in form
  SignUp,         // Pre-built sign-up form
  UserButton,     // User avatar with dropdown menu
  useUser,        // Hook for user data: { user, isLoaded }
  useClerk,       // Hook for Clerk instance: { signOut }
  Waitlist        // Waitlist component (when enabled)
} from '@clerk/clerk-react';
```

### Usage Patterns

**Auth Flow (App.tsx):**
```tsx
<SignedOut>
  <SignIn routing="hash" />
</SignedOut>
<SignedIn>
  <Dashboard />
</SignedIn>
```

**User Data (ProfilePage):**
```tsx
const { user, isLoaded } = useUser();
const fullName = user?.fullName || user?.firstName || 'User';
const email = user?.primaryEmailAddress?.emailAddress || '';
```

**Sign Out:**
```tsx
const { signOut } = useClerk();
<button onClick={() => signOut()}>Sign Out</button>
```

### Dark Theme Styling
```tsx
<SignIn
  appearance={{
    elements: {
      card: 'bg-zinc-900 border border-zinc-800',
      headerTitle: 'text-white',
      formFieldInput: 'bg-zinc-800 border-zinc-700 text-white',
      formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-500',
    },
  }}
/>
```
