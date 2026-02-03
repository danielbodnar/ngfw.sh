/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  readonly DEMO_INSTANCE?: string
  readonly DEMO_INSTANCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
