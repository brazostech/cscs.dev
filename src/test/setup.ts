/**
 * Vitest test setup file.
 *
 * This file runs before each test file and sets up:
 * - Jest DOM matchers for better assertions
 * - Automatic cleanup after each test
 * - Global mocks for browser APIs not available in jsdom
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup DOM after each test to prevent test pollution
afterEach(() => {
  cleanup();
});

// Mock window.location for navigation tests
const mockLocation = {
  href: "http://localhost:4321",
  pathname: "/",
  search: "",
  hash: "",
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

// Mock window.alert for form submission feedback
window.alert = vi.fn();

// Mock window.confirm for delete confirmations
window.confirm = vi.fn(() => true);

// Mock matchMedia for responsive components
Object.defineProperty(window, "matchMedia", {
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

// Mock ResizeObserver (used by some UI components)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock IntersectionObserver (used for lazy loading)
class MockIntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

window.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;
