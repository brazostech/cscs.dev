import PocketBase from 'pocketbase';

// PocketBase URL - client-side only (static site)
// Development: http://localhost:8080
// Production: https://api.cscs.dev
function getPocketBaseUrl(): string {
  // If explicitly set, use that
  if (import.meta.env.PUBLIC_POCKETBASE_URL) {
    return import.meta.env.PUBLIC_POCKETBASE_URL;
  }

  // Production mode - use public API
  if (import.meta.env.PROD) {
    return 'https://api.cscs.dev';
  }

  // Development mode - use localhost (accessible from browser)
  return 'http://localhost:8080';
}

const PB_URL = getPocketBaseUrl();

// Create a single instance to be shared across the app
export const pb = new PocketBase(PB_URL);

// Enable auto cancellation for duplicated requests
pb.autoCancellation(false);

// Types for user authentication
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatar?: string;
  verified: boolean;
  created: string;
  updated: string;
}

export interface RegisterData {
  email: string;
  password: string;
  passwordConfirm: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Helper functions for authentication
export async function register(data: RegisterData) {
  return await pb.collection('users').create(data);
}

export async function login(data: LoginData) {
  return await pb.collection('users').authWithPassword(data.email, data.password);
}

export async function logout() {
  pb.authStore.clear();
}

export function getCurrentUser(): AuthUser | null {
  return pb.authStore.model as AuthUser | null;
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

// Listen to auth state changes
export function onAuthChange(callback: (user: AuthUser | null) => void) {
  pb.authStore.onChange(() => {
    callback(getCurrentUser());
  });
}

// Request password reset
export async function requestPasswordReset(email: string) {
  return await pb.collection('users').requestPasswordReset(email);
}

// Verify email
export async function requestVerification(email: string) {
  return await pb.collection('users').requestVerification(email);
}
