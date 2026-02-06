-- Migration: Add ddns_configs table
-- Created: 2026-02-06

CREATE TABLE IF NOT EXISTS ddns_configs (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    provider TEXT NOT NULL,
    hostname TEXT NOT NULL,
    username TEXT,
    password TEXT,
    last_update INTEGER,
    current_ip TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX idx_ddns_configs_device_id ON ddns_configs(device_id);
