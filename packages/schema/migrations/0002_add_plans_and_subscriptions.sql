-- Migration number: 0002 	 2026-02-03T00:00:00.000Z
-- Adds plans, plan_limits, and subscriptions tables for the 4-tier pricing model

CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_monthly INTEGER NOT NULL,
    price_annual INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plan_limits (
    plan_id TEXT NOT NULL REFERENCES plans(id),
    limit_key TEXT NOT NULL,
    limit_value INTEGER NOT NULL,
    PRIMARY KEY (plan_id, limit_key)
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    cancel_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Seed the 4 pricing tiers

INSERT INTO plans (id, name, description, price_monthly, price_annual, sort_order) VALUES
    ('starter', 'Starter', 'Essential cloud management for a single router', 2500, 24000, 1),
    ('pro', 'Pro', 'Advanced security and networking for power users', 4900, 46800, 2),
    ('business', 'Business', 'Fleet management and API access for IT professionals', 9900, 94800, 3),
    ('business_plus', 'Business Plus', 'Unlimited everything for MSPs and multi-site businesses', 19900, 190800, 4);

-- Starter limits
INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES
    ('starter', 'routers', 1),
    ('starter', 'users', 1),
    ('starter', 'devices', 50),
    ('starter', 'firewall_rules', 25),
    ('starter', 'backups', 3),
    ('starter', 'dns_blocklists', 1),
    ('starter', 'dns_log_hours', 24),
    ('starter', 'traffic_log_hours', 24),
    ('starter', 'vlans', 2),
    ('starter', 'vpn_peers', 3),
    ('starter', 'vpn_client_profiles', 1),
    ('starter', 'ids_custom_rules', 0),
    ('starter', 'webhook_endpoints', 0),
    ('starter', 'audit_log_days', 7),
    ('starter', 'has_ids', 0),
    ('starter', 'has_ips', 0),
    ('starter', 'has_qos', 0),
    ('starter', 'has_ddns', 0),
    ('starter', 'has_traffic_stream', 0),
    ('starter', 'has_fleet', 0),
    ('starter', 'has_api', 0),
    ('starter', 'has_reports', 0);

-- Pro limits
INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES
    ('pro', 'routers', 3),
    ('pro', 'users', 3),
    ('pro', 'devices', 150),
    ('pro', 'firewall_rules', 100),
    ('pro', 'backups', 10),
    ('pro', 'dns_blocklists', 5),
    ('pro', 'dns_log_hours', 168),
    ('pro', 'traffic_log_hours', 168),
    ('pro', 'vlans', 8),
    ('pro', 'vpn_peers', 10),
    ('pro', 'vpn_client_profiles', 3),
    ('pro', 'ids_custom_rules', 10),
    ('pro', 'webhook_endpoints', 0),
    ('pro', 'audit_log_days', 30),
    ('pro', 'has_ids', 1),
    ('pro', 'has_ips', 1),
    ('pro', 'has_qos', 1),
    ('pro', 'has_ddns', 1),
    ('pro', 'has_traffic_stream', 1),
    ('pro', 'has_fleet', 0),
    ('pro', 'has_api', 0),
    ('pro', 'has_reports', 1);

-- Business limits
INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES
    ('business', 'routers', 10),
    ('business', 'users', 10),
    ('business', 'devices', 500),
    ('business', 'firewall_rules', -1),
    ('business', 'backups', 50),
    ('business', 'dns_blocklists', -1),
    ('business', 'dns_log_hours', 720),
    ('business', 'traffic_log_hours', 720),
    ('business', 'vlans', 32),
    ('business', 'vpn_peers', 50),
    ('business', 'vpn_client_profiles', 10),
    ('business', 'ids_custom_rules', 100),
    ('business', 'webhook_endpoints', 5),
    ('business', 'audit_log_days', 90),
    ('business', 'has_ids', 1),
    ('business', 'has_ips', 1),
    ('business', 'has_qos', 1),
    ('business', 'has_ddns', 1),
    ('business', 'has_traffic_stream', 1),
    ('business', 'has_fleet', 1),
    ('business', 'has_api', 1),
    ('business', 'has_reports', 1);

-- Business Plus limits (-1 = unlimited)
INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES
    ('business_plus', 'routers', 25),
    ('business_plus', 'users', -1),
    ('business_plus', 'devices', -1),
    ('business_plus', 'firewall_rules', -1),
    ('business_plus', 'backups', -1),
    ('business_plus', 'dns_blocklists', -1),
    ('business_plus', 'dns_log_hours', 2160),
    ('business_plus', 'traffic_log_hours', 2160),
    ('business_plus', 'vlans', -1),
    ('business_plus', 'vpn_peers', -1),
    ('business_plus', 'vpn_client_profiles', -1),
    ('business_plus', 'ids_custom_rules', -1),
    ('business_plus', 'webhook_endpoints', -1),
    ('business_plus', 'audit_log_days', 365),
    ('business_plus', 'has_ids', 1),
    ('business_plus', 'has_ips', 1),
    ('business_plus', 'has_qos', 1),
    ('business_plus', 'has_ddns', 1),
    ('business_plus', 'has_traffic_stream', 1),
    ('business_plus', 'has_fleet', 1),
    ('business_plus', 'has_api', 1),
    ('business_plus', 'has_reports', 1);
