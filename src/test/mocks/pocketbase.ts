/**
 * Comprehensive PocketBase mock for testing.
 *
 * Provides a mock implementation that mirrors the PocketBase SDK structure,
 * allowing tests to verify component behavior without real API calls.
 *
 * Usage in tests:
 * ```typescript
 * import { createMockPocketBase } from '../test/mocks';
 *
 * // Basic usage - pb with no authenticated user
 * const { pb } = createMockPocketBase();
 *
 * // With authenticated user
 * const { pb } = createMockPocketBase({ user: createMockUser() });
 *
 * // Access mock functions for assertions
 * expect(pb.collection).toHaveBeenCalledWith('events');
 * expect(pb._mocks.create).toHaveBeenCalledWith(expectedData);
 * ```
 */

import { vi, type Mock } from "vitest";
import { type MockUser } from "./factories";

export interface CollectionMocks {
  getOne: Mock;
  getList: Mock;
  getFullList: Mock;
  getFirstListItem: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  authWithPassword: Mock;
  requestVerification: Mock;
  requestPasswordReset: Mock;
}

export interface MockAuthStore {
  model: MockUser | null;
  token: string;
  isValid: boolean;
  clear: Mock;
  onChange: Mock;
  save: Mock;
}

export interface MockPocketBase {
  collection: Mock;
  authStore: MockAuthStore;
  autoCancellation: Mock;
  // Expose internal mocks for test assertions
  _mocks: CollectionMocks;
}

export interface CreateMockPocketBaseOptions {
  /** Pre-authenticated user. If provided, authStore.isValid will be true. */
  user?: MockUser | null;
  /** Custom collection mock overrides */
  collectionOverrides?: Partial<CollectionMocks>;
}

/**
 * Create a mock PocketBase instance with all methods stubbed.
 *
 * @param options - Configuration options
 * @returns Mock PocketBase instance with exposed mock functions
 */
export function createMockPocketBase(
  options: CreateMockPocketBaseOptions = {},
): MockPocketBase {
  const { user = null, collectionOverrides = {} } = options;

  // Collection method mocks with sensible defaults
  const collectionMocks: CollectionMocks = {
    getOne: vi.fn().mockRejectedValue(new Error("Not found")),
    getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
    getFullList: vi.fn().mockResolvedValue([]),
    getFirstListItem: vi.fn().mockRejectedValue(new Error("Not found")),
    create: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        id: `new_${Date.now()}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        ...data,
      }),
    ),
    update: vi.fn().mockImplementation((id, data) =>
      Promise.resolve({
        id,
        updated: new Date().toISOString(),
        ...data,
      }),
    ),
    delete: vi.fn().mockResolvedValue(true),
    authWithPassword: vi.fn().mockResolvedValue({
      token: "mock_token",
      record: user,
    }),
    requestVerification: vi.fn().mockResolvedValue(true),
    requestPasswordReset: vi.fn().mockResolvedValue(true),
    // Apply any overrides
    ...collectionOverrides,
  };

  // Auth store mock
  const authStore: MockAuthStore = {
    model: user,
    token: user ? "mock_token" : "",
    isValid: !!user,
    clear: vi.fn(() => {
      authStore.model = null;
      authStore.token = "";
      authStore.isValid = false;
    }),
    onChange: vi.fn(),
    save: vi.fn(),
  };

  // Collection factory that returns mocks
  const collection = vi.fn(() => collectionMocks);

  return {
    collection,
    authStore,
    autoCancellation: vi.fn(),
    _mocks: collectionMocks,
  };
}

/**
 * Create a mock PocketBase module that can be used with vi.mock().
 *
 * Usage:
 * ```typescript
 * vi.mock('../lib/pocketbase', () => createMockPocketBaseModule());
 * ```
 */
export function createMockPocketBaseModule(
  options: CreateMockPocketBaseOptions = {},
) {
  const mockPb = createMockPocketBase(options);

  return {
    pb: mockPb,
    // Re-export helper functions as simple mocks
    register: vi.fn().mockResolvedValue({ id: "new_user" }),
    login: vi
      .fn()
      .mockResolvedValue({ token: "mock_token", record: options.user }),
    logout: vi.fn(),
    getCurrentUser: vi.fn(() => options.user ?? null),
    isAuthenticated: vi.fn(() => !!options.user),
    onAuthChange: vi.fn(),
    requestPasswordReset: vi.fn().mockResolvedValue(true),
    requestVerification: vi.fn().mockResolvedValue(true),
  };
}

/**
 * Helper to configure a mock to return specific event data.
 */
export function mockGetOneEvent(
  mocks: CollectionMocks,
  event: Record<string, unknown>,
): void {
  mocks.getOne.mockResolvedValue(event);
}

/**
 * Helper to configure a mock to return a list of events.
 */
export function mockGetFullListEvents(
  mocks: CollectionMocks,
  events: Record<string, unknown>[],
): void {
  mocks.getFullList.mockResolvedValue(events);
}

/**
 * Helper to make create/update fail with an error.
 */
export function mockApiError(
  mockFn: Mock,
  message: string = "API Error",
): void {
  mockFn.mockRejectedValue(new Error(message));
}

/**
 * Reset all mocks in a collection.
 */
export function resetCollectionMocks(mocks: CollectionMocks): void {
  Object.values(mocks).forEach((mock) => {
    if (typeof mock.mockReset === "function") {
      mock.mockReset();
    }
  });
}
