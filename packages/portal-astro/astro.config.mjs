import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import clerk from '@clerk/astro';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'cloudflare',
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    clerk(),
    vue({
      appEntrypoint: '/src/pages/_app',
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  site: 'https://app.ngfw.sh',
});
