import { useState, useEffect } from "react";
import { pb, getCurrentUser, onAuthChange } from "../lib/pocketbase";
import type { UserRecord } from "../lib/types";

// Hook to manage authentication state
export function useAuth() {
  const [user, setUser] = useState<UserRecord | null>(getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load - check if user is authenticated
    setUser(getCurrentUser());
    setIsLoading(false);

    // Subscribe to auth changes
    onAuthChange((authUser) => {
      setUser(authUser);
    });
  }, []);

  return {
    user,
    isAuthenticated: pb.authStore.isValid,
    isLoading,
  };
}
