// Unit tests for the pure helpers in ../scripts/pocketbase-download.mjs.
// The install path itself is exercised by the "Install PocketBase with make"
// CI step, because it needs the network.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PB_VERSION,
  parsePocketBaseVersion,
} from "../scripts/pocketbase-download.mjs";

describe("parsePocketBaseVersion", () => {
  test("reads the version from --version output", () => {
    assert.equal(
      parsePocketBaseVersion("pocketbase version 0.34.0\n"),
      "0.34.0",
    );
  });

  test("returns null for output without a version", () => {
    assert.equal(parsePocketBaseVersion(""), null);
    assert.equal(parsePocketBaseVersion("command not found"), null);
  });

  test("matches the pin for a binary reporting it", () => {
    assert.equal(
      parsePocketBaseVersion(`pocketbase version ${PB_VERSION}`),
      PB_VERSION,
    );
  });
});
