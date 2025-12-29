# NGFW.sh Documentation

Technical documentation for NGFW.sh, built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

**Live site**: [docs.ngfw.sh](https://docs.ngfw.sh)

## Development

```bash
# Install dependencies
bun install

# Start dev server at localhost:4321
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Deployment

The documentation is deployed to Cloudflare Workers:

```bash
bun run deploy
```

This builds the site and deploys to `docs.ngfw.sh`.

## Project Structure

```
docs/
├── src/
│   ├── assets/          # Images and logos
│   ├── content/
│   │   └── docs/        # Documentation pages (MDX/MD)
│   │       ├── getting-started/
│   │       ├── configuration/
│   │       ├── security/
│   │       ├── services/
│   │       ├── api/
│   │       └── fleet/
│   └── styles/          # Custom CSS
├── public/              # Static assets
├── astro.config.mjs     # Astro configuration
└── wrangler.jsonc       # Cloudflare Workers config
```

## Writing Documentation

### Creating a New Page

Add a new `.md` or `.mdx` file in `src/content/docs/`:

```markdown
---
title: Page Title
description: Brief description for SEO
---

Your content here...
```

### Using Components

Starlight provides built-in components:

```mdx
import { Card, CardGrid, Tabs, TabItem } from '@astrojs/starlight/components';

<CardGrid>
  <Card title="Feature" icon="star">
    Description of the feature.
  </Card>
</CardGrid>

<Tabs>
  <TabItem label="npm">npm install</TabItem>
  <TabItem label="bun">bun install</TabItem>
</Tabs>
```

### Sidebar Configuration

Update the sidebar in `astro.config.mjs`:

```javascript
sidebar: [
  {
    label: 'Section Name',
    items: [
      { label: 'Page Title', slug: 'section/page-slug' },
    ],
  },
],
```

## Configuration

### Astro Config (`astro.config.mjs`)

- Site URL: `https://docs.ngfw.sh`
- Theme customization in Starlight options
- Cloudflare adapter for Workers deployment

### Wrangler Config (`wrangler.jsonc`)

- Worker name: `ngfw-docs`
- Custom domain: `docs.ngfw.sh`
