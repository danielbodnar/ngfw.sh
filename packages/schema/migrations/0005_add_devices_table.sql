-- Migration: Add devices table for fleet management
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT,
  serial TEXT,
  owner_id TEXT NOT NULL,
  firmware_version TEXT,
  status TEXT NOT NULL DEFAULT 'provisioning',
  api_key TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen INTEGER
);

CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_api_key ON devices(api_key);
