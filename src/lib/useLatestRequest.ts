import { useCallback, useRef } from "react";

/**
 * Sequence overlapping async loads so only the newest one may write state.
 *
 * Call the returned `begin()` when a load starts. It returns an `isLatest()`
 * check: after each `await`, and before every state write (including in
 * `catch`), return early when it is false. A slow earlier response then cannot
 * overwrite a newer one. `begin` is stable, so it is safe in `useCallback` deps.
 */
export function useLatestRequest(): () => () => boolean {
  const counter = useRef(0);
  return useCallback(() => {
    const id = ++counter.current;
    return () => id === counter.current;
  }, []);
}
