import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useLatestRequest } from "./useLatestRequest";

describe("useLatestRequest", () => {
  it("reports the newest load as latest", () => {
    const { result } = renderHook(() => useLatestRequest());

    const isLatest = result.current();

    expect(isLatest()).toBe(true);
  });

  it("reports an earlier load as stale once a later one begins", () => {
    const { result } = renderHook(() => useLatestRequest());

    const first = result.current();
    const second = result.current();

    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it("keeps the same begin function across rerenders", () => {
    const { result, rerender } = renderHook(() => useLatestRequest());
    const begin = result.current;

    rerender();

    expect(result.current).toBe(begin);
  });
});
