-- Migration number: 0007   2026-02-09T00:00:00.000Z
-- Add logs and metrics tables with performance indexes
-- Closes #39: Add missing database indexes

-- Logs table for system, security, and network event logging
CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Metrics table for device telemetry (CPU, memory, interfaces, etc.)
CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    cpu REAL,
    memory REAL,
    disk REAL,
    interfaces TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_logs_device_id_timestamp ON logs(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_metrics_device_id_timestamp ON metrics(device_id, timestamp DESC);
