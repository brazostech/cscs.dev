/**
 * Test mocks - centralized exports for test utilities.
 */

export {
  createMockEvent,
  createMockUser,
  createMockModerator,
  createMockEvents,
  resetFactoryCounters,
  type MockEvent,
  type MockUser,
} from "./factories";

export {
  createMockPocketBase,
  createMockPocketBaseModule,
  mockGetOneEvent,
  mockGetFullListEvents,
  mockApiError,
  resetCollectionMocks,
  type CollectionMocks,
  type MockPocketBase,
  type MockAuthStore,
  type CreateMockPocketBaseOptions,
} from "./pocketbase";
