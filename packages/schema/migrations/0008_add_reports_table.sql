-- Migration number: 0008   2026-02-09T00:00:00.000Z
-- Add reports table for generated report metadata

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    type TEXT NOT NULL,
    format TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    title TEXT NOT NULL,
    date_start TEXT NOT NULL,
    date_end TEXT NOT NULL,
    r2_key TEXT,
    file_size INTEGER,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    error_message TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reports_owner_id ON reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_reports_device_id ON reports(device_id);
CREATE INDEX IF NOT EXISTS idx_reports_owner_created ON reports(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
