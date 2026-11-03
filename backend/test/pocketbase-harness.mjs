// Gets the pinned, checksum-verified PocketBase (the version and checksums live
// in ../scripts/pocketbase-download.mjs) and runs it on a free local port with
// a temporary data directory and this repo's migrations.
// Never talks to api.cscs.dev: the server binds to 127.0.0.1 only.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensurePocketBase } from "../scripts/pocketbase-download.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
export const MIGRATIONS_DIR = join(repoRoot, "backend", "pb_migrations");

export const SUPERUSER_EMAIL = "superuser@example.test";
export const SUPERUSER_PASSWORD = "superuser-test-password";

function freePort() {
  return new Promise((resolvePort, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolvePort(port));
    });
  });
}

/**
 * Starts a throwaway PocketBase with all migrations applied and a superuser.
 * Returns { baseUrl, stop }.
 */
export async function startPocketBase() {
  const bin = await ensurePocketBase();
  const dataDir = mkdtempSync(join(tmpdir(), "cscs-pb-test-"));
  const common = [`--dir=${dataDir}`, `--migrationsDir=${MIGRATIONS_DIR}`];

  let child;
  let exited = false;
  const killChild = () => {
    if (child && !exited) child.kill("SIGKILL");
  };
  // Covers a normal exit and an uncaught error. A SIGKILL of the test
  // process itself cannot be handled; the OS then leaves the child behind.
  process.once("exit", killChild);

  const stop = async () => {
    if (child && !exited) {
      child.kill("SIGTERM");
      const killTimer = setTimeout(killChild, 10_000);
      await new Promise((r) => child.once("exit", r));
      clearTimeout(killTimer);
    }
    process.removeListener("exit", killChild);
    rmSync(dataDir, { recursive: true, force: true });
  };

  try {
    execFileSync(
      bin,
      ["superuser", "create", SUPERUSER_EMAIL, SUPERUSER_PASSWORD, ...common],
      { stdio: "pipe" },
    );

    const port = await freePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    child = spawn(bin, ["serve", `--http=127.0.0.1:${port}`, ...common], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    child.once("exit", () => (exited = true));

    const deadline = Date.now() + 30_000;
    for (;;) {
      if (exited)
        throw new Error(`PocketBase exited during startup:\n${output}`);
      try {
        const res = await fetch(`${baseUrl}/api/health`, {
          signal: AbortSignal.timeout(5_000),
        });
        if (res.ok) break;
      } catch {
        // not listening yet
      }
      if (Date.now() > deadline) {
        throw new Error(`PocketBase did not become healthy:\n${output}`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    return { baseUrl, stop };
  } catch (err) {
    await stop();
    throw err;
  }
}
