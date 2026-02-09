/**
 * Vitest test setup file.
 * Configures global test environment and mocks.
 */

import { vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock environment variables
process.env.VITE_API_URL = 'https://test-api.ngfw.sh';
process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key';
process.env.DEMO_INSTANCE = 'false';

// Mock window.fetch for tests that don't explicitly mock it
globalThis.fetch = vi.fn();

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
