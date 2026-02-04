-- Migration number: 0003 	 2026-02-03T00:00:00.000Z
-- Remove artificial per-plan limits (devices, users, vpn_peers, firewall_rules)
-- Pricing is feature-based, not limit-based

DELETE FROM plan_limits WHERE limit_key IN (
    'users',
    'devices',
    'vpn_peers',
    'firewall_rules'
);
