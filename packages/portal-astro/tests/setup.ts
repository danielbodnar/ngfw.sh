/**
 * Global test setup for Vitest.
 *
 * This file runs before all tests and sets up mocks, polyfills,
 * and test utilities.
 */

import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// Mock window.matchMedia (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver (used by lazy loading components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver (used by chart components)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock fetch globally
global.fetch = vi.fn();

// Configure Vue Test Utils
config.global.stubs = {
  // Stub out heavy components that don't need rendering in tests
  transition: false,
  'transition-group': false,
};

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
