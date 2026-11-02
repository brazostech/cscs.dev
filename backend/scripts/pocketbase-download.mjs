// The one place that knows which PocketBase release this repo pins, where its
// SHA-256 checksums live, and how to fetch and verify it. Used by the API rule
// test harness (backend/test/pocketbase-harness.mjs) and by `make pocketbase`
// (run from backend/), which installs the binary at backend/pocketbase.
// Downloaded bytes are only ever installed or run after their SHA-256 matches
// the pinned checksum. A binary already at the install path is not re-hashed:
// it is kept only if it runs and reports the pinned version.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
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
// node_modules/ is gitignored. CI caches this directory with actions/cache.
const CACHE_DIR = join(repoRoot, "node_modules", ".cache", "pocketbase");
const DEFAULT_INSTALL_PATH = join(repoRoot, "backend", "pocketbase");

/** Returns the path to a verified PocketBase binary, downloading it if needed. */
export async function ensurePocketBase() {
  const platform = `${process.platform}-${process.arch}`;
  const expected = CHECKSUMS[platform];
  if (!expected) {
    throw new Error(
      `No pinned PocketBase checksum for ${platform}. Supported: ${Object.keys(CHECKSUMS).join(", ")}. Use the container instead (podman-compose up --build -d pocketbase).`,
    );
  }
  const asset = `pocketbase_${PB_VERSION}_${OS_NAMES[process.platform]}_${ARCH_NAMES[process.arch]}.zip`;
  const dir = join(CACHE_DIR, PB_VERSION, platform);
  const zipPath = join(dir, asset);
  const binPath = join(dir, "pocketbase");
  mkdirSync(dir, { recursive: true });

  let zip;
  if (existsSync(zipPath)) {
    const cached = await readFile(zipPath);
    if (sha256(cached) === expected) zip = cached;
    else rmSync(zipPath, { force: true });
  }
  if (!zip) {
    zip = await download(asset);
    const actual = sha256(zip);
    if (actual !== expected) {
      throw new Error(
        `SHA-256 mismatch for ${asset}: expected ${expected}, got ${actual}`,
      );
    }
    const tmpZip = `${zipPath}.${process.pid}.tmp`;
    writeFileSync(tmpZip, zip);
    renameSync(tmpZip, zipPath);
  }

  // Extract from the verified bytes (not the path on disk, which could change
  // after hashing) into a private directory, then rename the binary into place.
  // The rename is atomic, so concurrent test files never see a partial binary
  // or overwrite one that is running.
  const work = mkdtempSync(join(dir, "extract-"));
  try {
    const verifiedZip = join(work, asset);
    writeFileSync(verifiedZip, zip);
    execFileSync("unzip", ["-o", "-q", verifiedZip, "pocketbase", "-d", work]);
    chmodSync(join(work, "pocketbase"), 0o755);
    renameSync(join(work, "pocketbase"), binPath);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  return binPath;
}

async function download(asset) {
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${asset}`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw lastError;
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Installs the pinned PocketBase at `dest` (default backend/pocketbase).
 * Idempotent: if `dest` already runs and reports the pinned version, nothing
 * is downloaded or changed. Otherwise the checksum-verified binary replaces it
 * atomically. Returns { path, installed }.
 */
export async function installPocketBase(dest = DEFAULT_INSTALL_PATH) {
  const current = installedVersion(dest);
  if (current === PB_VERSION) return { path: dest, installed: false };

  const verified = await ensurePocketBase();
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.tmp`;
  try {
    copyFileSync(verified, tmp);
    chmodSync(tmp, 0o755);
    renameSync(tmp, dest);
  } finally {
    rmSync(tmp, { force: true });
  }
  return { path: dest, installed: true };
}

/** Version reported by the binary at `path`, or null if absent or not runnable. */
function installedVersion(path) {
  if (!existsSync(path)) return null;
  try {
    const out = execFileSync(path, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    });
    return /\bversion (\S+)/.exec(out)?.[1] ?? null;
  } catch {
    return null;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const { path, installed } = await installPocketBase(process.argv[2]);
    console.log(
      installed
        ? `Installed PocketBase ${PB_VERSION} at ${path}`
        : `PocketBase ${PB_VERSION} already installed at ${path}`,
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
