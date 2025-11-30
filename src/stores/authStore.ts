import { useState, useEffect } from 'react';
import { pb, getCurrentUser, onAuthChange, type AuthUser } from '../lib/pocketbase';

// Hook to manage authentication state
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load - check if user is authenticated
    setUser(getCurrentUser());
    setIsLoading(false);

    // Subscribe to auth changes
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser);
    });

    return () => {
      // Cleanup
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return {
    user,
    isAuthenticated: pb.authStore.isValid,
    isLoading,
  };
}
