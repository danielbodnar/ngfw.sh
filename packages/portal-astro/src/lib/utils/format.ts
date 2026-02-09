/**
 * Formatting utilities for displaying data in the UI.
 *
 * @module lib/utils/format
 */

/**
 * Formats bytes into human-readable units (KB, MB, GB).
 *
 * @param b - Number of bytes
 * @returns Formatted string with appropriate unit
 *
 * @example
 * ```ts
 * formatBytes(1024) // "1.00 KB"
 * formatBytes(1048576) // "1.00 MB"
 * formatBytes(1073741824) // "1.00 GB"
 * ```
 */
export function formatBytes(b: number): string {
	if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
	if (b >= 1e6) return `${(b / 1e6).toFixed(2)} MB`;
	if (b >= 1e3) return `${(b / 1e3).toFixed(2)} KB`;
	return `${b} B`;
}

/**
 * Formats bytes per second into human-readable rate.
 *
 * @param b - Number of bytes per second
 * @returns Formatted string with appropriate unit and "/s" suffix
 *
 * @example
 * ```ts
 * formatRate(1024) // "1.00 KB/s"
 * formatRate(1048576) // "1.00 MB/s"
 * ```
 */
export function formatRate(b: number): string {
	return `${formatBytes(b)}/s`;
}

/**
 * Formats a number with locale-specific thousands separators.
 *
 * @param n - Number to format
 * @returns Formatted string with commas (or locale-specific separator)
 *
 * @example
 * ```ts
 * formatNumber(1234567) // "1,234,567"
 * ```
 */
export function formatNumber(n: number): string {
	return n.toLocaleString();
}

/**
 * Formats seconds into human-readable uptime string.
 *
 * @param seconds - Number of seconds
 * @returns Formatted string like "14d 7h 23m"
 *
 * @example
 * ```ts
 * formatUptime(86400) // "1d 0h 0m"
 * formatUptime(3661) // "1h 1m 1s"
 * formatUptime(125523) // "1d 10h 52m"
 * ```
 */
export function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (secs > 0 && days === 0) parts.push(`${secs}s`);

	return parts.join(" ") || "0s";
}
