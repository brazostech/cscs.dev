// Downloads a pinned PocketBase release, checks its SHA-256, and runs it on a
// free local port with a temporary data directory and this repo's migrations.
// Never talks to api.cscs.dev: the server binds to 127.0.0.1 only.
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PB_VERSION = "0.34.0";

// SHA-256 of each release zip, copied from the release's checksums.txt:
// https://github.com/pocketbase/pocketbase/releases/download/v0.34.0/checksums.txt
// Update these together with PB_VERSION and the Containerfile's POCKETBASE_VERSION.
const CHECKSUMS = {
  "darwin-x64":
    "4328404fb200b60e8e0e2ac51ae0f0187e689bc0979b37369f6070e89f2f8481",
  "darwin-arm64":
    "b19c2994a6d58c55ba0232293200de7b501aaa7d66da73cf10a86ffbc9ca9483",
  "linux-x64":
    "dea29ca40669fb7f31bb47761a8c3494c3f06b42f99d60831bbbcf4bdef5f69d",
  "linux-arm64":
    "631f698900d83ff4b0735a146d33b4e59c99de923f1ae488a90ce58bd6a69f53",
};

const OS_NAMES = { darwin: "darwin", linux: "linux" };
const ARCH_NAMES = { x64: "amd64", arm64: "arm64" };

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
export const MIGRATIONS_DIR = join(repoRoot, "backend", "pb_migrations");
// node_modules/ is gitignored, and CI already caches npm there.
const CACHE_DIR = join(repoRoot, "node_modules", ".cache", "pocketbase");

export const SUPERUSER_EMAIL = "superuser@example.test";
export const SUPERUSER_PASSWORD = "superuser-test-password";

/** Returns the path to a verified PocketBase binary, downloading it if needed. */
export async function ensurePocketBase() {
  const platform = `${process.platform}-${process.arch}`;
  const expected = CHECKSUMS[platform];
  if (!expected) {
    throw new Error(
      `No pinned PocketBase checksum for ${platform}. Supported: ${Object.keys(CHECKSUMS).join(", ")}`,
    );
  }
  const asset = `pocketbase_${PB_VERSION}_${OS_NAMES[process.platform]}_${ARCH_NAMES[process.arch]}.zip`;
  const dir = join(CACHE_DIR, PB_VERSION, platform);
  const zipPath = join(dir, asset);
  const binPath = join(dir, "pocketbase");
  mkdirSync(dir, { recursive: true });

  if (existsSync(zipPath) && existsSync(binPath)) {
    if (sha256(await readFile(zipPath)) === expected) return binPath;
    rmSync(zipPath, { force: true });
  }

  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${asset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const zip = Buffer.from(await res.arrayBuffer());
  const actual = sha256(zip);
  if (actual !== expected) {
    throw new Error(
      `SHA-256 mismatch for ${asset}: expected ${expected}, got ${actual}`,
    );
  }
  await writeFile(zipPath, zip);
  execFileSync("unzip", ["-o", "-q", zipPath, "pocketbase", "-d", dir]);
  chmodSync(binPath, 0o755);
  return binPath;
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

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

  execFileSync(
    bin,
    ["superuser", "create", SUPERUSER_EMAIL, SUPERUSER_PASSWORD, ...common],
    { stdio: "pipe" },
  );

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(bin, ["serve", `--http=127.0.0.1:${port}`, ...common], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  let exited = false;
  child.once("exit", () => (exited = true));

  const stop = async () => {
    if (!exited) {
      child.kill("SIGTERM");
      await new Promise((r) => child.once("exit", r));
    }
    rmSync(dataDir, { recursive: true, force: true });
  };

  const deadline = Date.now() + 30_000;
  for (;;) {
    if (exited) {
      await stop();
      throw new Error(`PocketBase exited during startup:\n${output}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) break;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) {
      await stop();
      throw new Error(`PocketBase did not become healthy:\n${output}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  return { baseUrl, stop };
}
