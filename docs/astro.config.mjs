// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import cloudflare from '@astrojs/cloudflare'

// https://astro.build/config
export default defineConfig({
  site: 'https://docs.ngfw.sh',
  integrations: [
    starlight({
      title: 'NGFW.sh Docs',
      description: 'Documentation for NGFW.sh - Next-generation firewall management',
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: false,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/danielbodnar/ngfw.sh' },
      ],
      editLink: {
        baseUrl: 'https://github.com/danielbodnar/ngfw.sh/edit/main/docs/',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
            { label: 'Installation', slug: 'getting-started/installation' },
          ],
        },
        {
          label: 'Configuration',
          items: [
            { label: 'WAN Setup', slug: 'configuration/wan' },
            { label: 'LAN & VLANs', slug: 'configuration/lan' },
            { label: 'WiFi Networks', slug: 'configuration/wifi' },
            { label: 'DHCP Server', slug: 'configuration/dhcp' },
          ],
        },
        {
          label: 'Security',
          items: [
            { label: 'Firewall Rules', slug: 'security/firewall' },
            { label: 'NAT & Port Forwarding', slug: 'security/nat' },
            { label: 'DNS Filtering', slug: 'security/dns-filtering' },
            { label: 'IDS/IPS', slug: 'security/ids-ips' },
          ],
        },
        {
          label: 'Services',
          items: [
            { label: 'VPN Server', slug: 'services/vpn-server' },
            { label: 'VPN Client', slug: 'services/vpn-client' },
            { label: 'QoS', slug: 'services/qos' },
            { label: 'Dynamic DNS', slug: 'services/ddns' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'Overview', slug: 'api/overview' },
            { label: 'Authentication', slug: 'api/authentication' },
            { label: 'OpenAPI Spec', link: 'https://specs.ngfw.sh' },
          ],
        },
        {
          label: 'Fleet Management',
          items: [
            { label: 'Multi-Device Setup', slug: 'fleet/setup' },
            { label: 'Templates', slug: 'fleet/templates' },
          ],
        },
      ],
    }),
  ],
  adapter: cloudflare(),
})
