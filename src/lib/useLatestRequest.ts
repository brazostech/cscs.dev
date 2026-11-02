import { useCallback, useRef } from "react";

/**
 * Sequence overlapping async loads so only the newest one may write state.
 *
 * `const beginLoad = useLatestRequest()`, then call `const isLatest =
 * beginLoad()` when a load starts. After each `await`, and before every state
 * write (including in `catch`), return early when `isLatest()` is false. A slow
 * earlier response then cannot overwrite a newer one. Guard `finally` the same
 * way, or derive a loading flag from `isLatest()`, so a dropped load does not
 * clear state that a newer load still owns. `beginLoad` is stable, so it is
 * safe in `useCallback` deps.
 */
export function useLatestRequest(): () => () => boolean {
  const counter = useRef(0);
  return useCallback(() => {
    const id = ++counter.current;
    return () => id === counter.current;
  }, []);
}
