/**
 * API error handling.
 *
 * @module lib/api/errors
 */

/**
 * Custom error class for API failures.
 *
 * Includes HTTP status code and detailed message from the server.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
