/**
 * Test mocks - centralized exports for test utilities.
 */

export {
  createMockEvent,
  createMockUser,
  createMockModerator,
  createMockEvents,
  createMockRsvp,
  createMockRsvps,
  createMockBook,
  createMockBooks,
  resetFactoryCounters,
  type MockEvent,
  type MockUser,
  type MockRsvp,
  type MockBook,
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
