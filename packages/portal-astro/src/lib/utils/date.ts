/**
 * Date formatting utilities.
 *
 * @module lib/utils/date
 */

/**
 * Formats a Unix timestamp into a localized date/time string.
 *
 * @param timestamp - Unix timestamp in seconds
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDate(1609459200) // "Jan 1, 2021, 12:00 AM"
 * formatDate(1609459200, { dateStyle: 'short' }) // "1/1/21"
 * ```
 */
export function formatDate(
	timestamp: number,
	options: Intl.DateTimeFormatOptions = {
		dateStyle: "medium",
		timeStyle: "short",
	},
): string {
	return new Date(timestamp * 1000).toLocaleString(undefined, options);
}

/**
 * Formats a Unix timestamp into a relative time string.
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Relative time string like "2 hours ago" or "in 3 days"
 *
 * @example
 * ```ts
 * formatRelativeTime(Date.now() / 1000 - 3600) // "1 hour ago"
 * formatRelativeTime(Date.now() / 1000 + 86400) // "in 1 day"
 * ```
 */
export function formatRelativeTime(timestamp: number): string {
	const now = Date.now() / 1000;
	const diff = timestamp - now;
	const absDiff = Math.abs(diff);

	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

	if (absDiff < 60) {
		return rtf.format(Math.round(diff), "second");
	} else if (absDiff < 3600) {
		return rtf.format(Math.round(diff / 60), "minute");
	} else if (absDiff < 86400) {
		return rtf.format(Math.round(diff / 3600), "hour");
	} else if (absDiff < 604800) {
		return rtf.format(Math.round(diff / 86400), "day");
	} else if (absDiff < 2592000) {
		return rtf.format(Math.round(diff / 604800), "week");
	} else if (absDiff < 31536000) {
		return rtf.format(Math.round(diff / 2592000), "month");
	} else {
		return rtf.format(Math.round(diff / 31536000), "year");
	}
}

/**
 * Formats a Unix timestamp into a short date string.
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Short date string like "Jan 1, 2021"
 *
 * @example
 * ```ts
 * formatShortDate(1609459200) // "Jan 1, 2021"
 * ```
 */
export function formatShortDate(timestamp: number): string {
	return new Date(timestamp * 1000).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/**
 * Formats a Unix timestamp into a time-only string.
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Time string like "12:00 AM"
 *
 * @example
 * ```ts
 * formatTime(1609459200) // "12:00 AM"
 * ```
 */
export function formatTime(timestamp: number): string {
	return new Date(timestamp * 1000).toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}
