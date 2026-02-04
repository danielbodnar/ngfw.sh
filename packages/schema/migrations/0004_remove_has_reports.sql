-- Migration number: 0004 	 2026-02-03T00:00:00.000Z
-- Remove has_reports from plan_limits (feature not offered)

DELETE FROM plan_limits WHERE limit_key = 'has_reports';
