# NGFW.sh Pricing Research & Recommendation

> **Date:** 2026-02-03
> **Status:** Approved for implementation

---

## Competitive Landscape Summary

| Competitor | Target | Model | Price Range |
|---|---|---|---|
| **ZenArmor Home** | Home users | SW subscription (on OPNsense) | $9.99/mo |
| **ZenArmor SOHO** | Small office | SW subscription | $30.75/mo ($369/yr) |
| **ZenArmor Business** | SMB | SW subscription | $50+/mo |
| **Firewalla** | Home/prosumer | Hardware purchase + optional MSP | $0/mo (HW: $479-899) |
| **Firewalla MSP** | MSPs | Cloud portal subscription | $9.99/mo (3 devices) |
| **Untangle (Arista)** | Home | SW subscription | $4.17/mo ($50/yr) |
| **Untangle Business** | SMB | SW subscription, per-device | $25-50/mo (12-50 devices) |
| **Ubiquiti Hosting** | SMB | Cloud controller | $29/mo |
| **pfSense Plus** | Prosumer/SMB | SW license | $10.75/mo ($129/yr) |
| **Meraki Go** | Small business | HW purchase, no subscription | $340 one-time |
| **Cisco Meraki MX** | Enterprise | HW + mandatory license | $595+ HW, license/yr |

## Why NGFW.sh Can Command a Premium

NGFW.sh occupies a unique niche that none of the above fully addresses:

1. **Hardware + cloud-managed SaaS.** Users choose from a curated list of supported devices at sign-up (or add devices later via the portal). Unlike competitors that sell proprietary appliances at inflated margins, NGFW.sh supports commodity hardware — keeping the upfront cost low while delivering enterprise-grade management through the cloud.

2. **No self-hosting the management plane.** ZenArmor and pfSense require the user to run OPNsense/pfSense management locally. NGFW.sh's entire management console is hosted on Cloudflare's edge — zero server maintenance for the customer.

3. **Real-time WebSocket control.** Most competitors use polling or require local access. NGFW.sh provides real-time RPC to the router agent from anywhere via persistent WebSocket connections through Durable Objects.

4. **Edge-hosted globally.** Running on Cloudflare Workers means sub-50ms latency to the dashboard from virtually anywhere. No central server bottleneck.

5. **Full NGFW feature set in SaaS form.** IDS/IPS, DNS filtering, VPN management, QoS, traffic analytics, fleet management — features that typically require expensive enterprise hardware or complex self-hosted software stacks.

The model: customers purchase affordable supported hardware and pay a monthly subscription for the cloud management platform. This is comparable to the Meraki model (hardware + license) but at a fraction of the cost and without vendor lock-in on the hardware side.

## Pricing Tiers

| | **Starter** | **Pro** | **Business** | **Business Plus** |
|---|---|---|---|---|
| **Monthly** | **$25/mo** | **$49/mo** | **$99/mo** | **$199/mo** |
| **Annual** | **$240/yr** ($20/mo) | **$468/yr** ($39/mo) | **$948/yr** ($79/mo) | **$1,908/yr** ($159/mo) |
| **Annual Savings** | 20% | 20% | 20% | 20% |
| **Routers** | 1 | 3 | 10 | 25 |
| | | | | |
| **Core Features** | | | | |
| Cloud dashboard | Yes | Yes | Yes | Yes |
| Real-time monitoring | Yes | Yes | Yes | Yes |
| WAN/LAN/DHCP management | Yes | Yes | Yes | Yes |
| WiFi management | Yes | Yes | Yes | Yes |
| Firewall rules (unlimited) | Yes | Yes | Yes | Yes |
| NAT / port forwarding | Yes | Yes | Yes | Yes |
| Configuration backup (R2) | 3 backups | 10 backups | 50 backups | Unlimited |
| Firmware management | Yes | Yes | Yes | Yes |
| | | | | |
| **Security** | | | | |
| DNS filtering | Basic (1 blocklist) | Advanced (5 blocklists) | Advanced (unlimited) | Advanced (unlimited) |
| DNS query log | 24 hours | 7 days | 30 days | 90 days |
| IDS (detection) | - | Yes | Yes | Yes |
| IPS (prevention) | - | Yes | Yes | Yes |
| IDS/IPS custom rules | - | 10 rules | 100 rules | Unlimited |
| Threat intelligence feeds | - | Community | Commercial | Commercial + Premium |
| Traffic logs | 24 hours | 7 days | 30 days | 90 days |
| Real-time traffic stream | - | Yes | Yes | Yes |
| Security alerts | Email only | Email + push | Email + push + webhook | All + SIEM integration |
| | | | | |
| **Networking** | | | | |
| VLANs | 2 | 8 | 32 | Unlimited |
| VPN server (WireGuard, unlimited peers) | Yes | Yes | Yes | Yes |
| VPN client profiles | Yes | Yes | Yes | Yes |
| QoS / traffic shaping | - | Yes | Yes | Yes |
| Dynamic DNS | - | Yes | Yes | Yes |
| | | | | |
| **Fleet & Management** | | | | |
| Fleet management | - | - | Yes | Yes |
| Configuration templates | - | - | Yes | Yes |
| Multi-site management | - | - | Yes | Yes |
| REST API access | - | - | Yes | Yes |
| Webhooks | - | - | 5 endpoints | Unlimited |
| Audit log | 7 days | 30 days | 90 days | 1 year |
| PDF reports (R2) | - | Monthly | Weekly | Daily + on-demand |
| | | | | |
| **Support** | | | | |
| Community forum | Yes | Yes | Yes | Yes |
| Email support | - | Yes (48hr) | Yes (24hr) | Yes (4hr) |
| Priority support | - | - | - | Yes |
| SLA | - | - | 99.9% | 99.95% |
| Onboarding assistance | - | - | - | Yes |

## Pricing Rationale

### Starter at $25/mo

This is the "replace your router's terrible web UI" tier. One router, one user, core management features. The price point is justified by:

- Ubiquiti's cloud hosting starts at $29/mo
- ZenArmor SOHO is $30.75/mo
- Untangle business starts at $25/mo
- The convenience premium of zero self-hosting

### Pro at $49/mo

The "power user / home lab" tier. IDS/IPS, VPN, QoS, and traffic analytics are the features prosumers actually want. This competes with:

- ZenArmor SOHO + Business gap ($30-50/mo)
- Firewalla Gold Plus ($599 HW) + MSP ($10/mo) = ~$35/mo amortized over 2 years
- The value prop is all those features without buying hardware

### Business at $99/mo

The "IT consultant managing client networks" tier. Fleet management, API access, webhooks, and templates are the differentiators. Competitive with:

- ZenArmor Business ($50+/mo) but with cloud management included
- Meraki-style managed networking without the hardware lock-in
- $99/mo for 10 sites is far cheaper than 10x Meraki licenses

### Business Plus at $199/mo

The "MSP / multi-site small business" tier. Unlimited everything, premium threat feeds, compliance-grade audit logs, SLA. This undercuts:

- Cisco Meraki licensing (hundreds/yr per device)
- Enterprise NGFW subscriptions ($4K-8K/yr)
- Check Point SASE per-user pricing

## Annual Discount Strategy

A 20% discount for annual billing is standard in SaaS and accomplishes two things: reduces churn and improves cash flow predictability. The annual prices ($240, $468, $948, $1,908) are clean enough numbers for invoicing.

## Future Considerations

- **Per-router add-on packs** ($5-10/mo per additional router beyond tier limit)
- **Threat intelligence add-on** ($15/mo for premium feeds on lower tiers)
- **White-label option** for MSPs on Business Plus (custom branding, $299/mo)
- **Education/nonprofit discount** (50% off, matches ZenArmor's approach)

## Sources

- [ZenArmor Plans & Pricing](https://www.zenarmor.com/plans)
- [ZenArmor Subscriptions Documentation](https://www.zenarmor.com/docs/introduction/zenarmor-editions)
- [ZenArmor Free vs Home Editions](https://www.zenarmor.com/docs/guides/zenarmor-free-vs-home-editions)
- [Firewalla Products](https://firewalla.com/collections/firewalla-products)
- [Firewalla MSP](https://firewalla.net/plans)
- [Firewalla - Why No Monthly Fee](https://help.firewalla.com/hc/en-us/articles/360003608413-Why-no-monthly-fee)
- [Official UniFi Hosting - Ubiquiti Store](https://store.ui.com/us/en/products/unifi-hosting)
- [UniFi Cloud Controller Cost Comparison](https://www.unihosted.com/blog/cloud-unifi-pricing)
- [Netgate pfSense Plus Pricing](https://www.netgate.com/pricing-pfsense-plus)
- [Meraki Go Security Gateway](https://www.meraki-go.com/products/router-firewalls/)
- [Arista Edge Threat Management NG Firewall Packages](https://edge.arista.com/ng-firewall/software-packages/)
- [Firewall Software Pricing Guide 2025 - TrustRadius](https://solutions.trustradius.com/buyer-blog/firewall-software-pricing/)
- [Fortinet Firewall Pricing Guide 2026](https://stacklinkus.com/blog/fortinet-firewall-pricing-guide-us-market-2026/)
- [10 Best Small Business Firewalls 2025 - Comparitech](https://www.comparitech.com/net-admin/best-small-business-firewalls/)
