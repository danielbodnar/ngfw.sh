---
title: Firewall Rules
description: Configure firewall rules and zones
---

Create and manage firewall rules to control traffic between network zones.

## Zones

NGFW.sh uses a zone-based firewall:

- **WAN** - Internet-facing interface
- **LAN** - Local network
- **Guest** - Guest network
- **IoT** - IoT devices

## Rule Structure

Each rule specifies:
- Source and destination zones
- Protocol and ports
- Action (accept, drop, reject)
- Optional schedule

## Default Policies

Configure default actions for traffic between zone pairs.

See the [API Reference](/api/overview) for programmatic configuration.
