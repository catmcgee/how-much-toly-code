#!/usr/bin/env node
// One-time backfill: walks agave's full history at fixed intervals,
// blames the tree at each commit, and writes the count into
// data/snapshots.json. Resumable — already-recorded dates are skipped.
//
// Defaults: quarterly snapshots from 2018-01-01 to today (~32 points).
// Overrides via env: INTERVAL_MONTHS, START, PARALLEL, REPO_URL, REPO_DIR.

import { execSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SNAPSHOTS_FILE = resolve(ROOT, "data/snapshots.json");

const REPO_URL = process.env.REPO_URL ?? "https://github.com/anza-xyz/agave.git";
const REPO_DIR = process.env.REPO_DIR ?? "/tmp/agave-backfill";
const PARALLEL = Number(process.env.PARALLEL ?? "8");
const INTERVAL_MONTHS = Number(process.env.INTERVAL_MONTHS ?? "3");
const START = process.env.START ?? "2018-01-01";

const AUTHOR_RE = /^author Anatoly[ -]?Yakovenko/i;
const SKIP_RE =
  /(?:^|\/)(Cargo\.lock|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$|\.(?:png|jpg|jpeg|gif|webp|ico|pdf|zip|gz|tar|wasm|so|dylib|dll|exe)$/i;

function sh(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 1024 * 1024 * 256,
    ...opts,
  });
}

// 1. Clone with full history (or fetch if already present).
if (!existsSync(`${REPO_DIR}/.git`)) {
  console.error(`cloning full history → ${REPO_DIR} (multi-GB, takes a while)`);
  sh(`git clone "${REPO_URL}" "${REPO_DIR}"`, { stdio: "inherit" });
} else {
  console.error(`fetching latest in ${REPO_DIR}...`);
  sh(`git -C "${REPO_DIR}" fetch --all --tags`, { stdio: "inherit" });
}

// 2. Resolve default branch.
let defaultBranch;
try {
  defaultBranch = sh(
    `git -C "${REPO_DIR}" symbolic-ref --short refs/remotes/origin/HEAD`,
  )
    .trim()
    .replace(/^origin\//, "");
} catch {
  defaultBranch = "master";
}
console.error(`default branch: ${defaultBranch}`);

// 3. Generate sample dates: 1st of every Nth month from START to today.
const today = new Date();
const dates = [];
let cursor = new Date(`${START}T00:00:00Z`);
while (cursor <= today) {
  dates.push(cursor.toISOString().slice(0, 10));
  cursor = new Date(
    Date.UTC(
      cursor.getUTCFullYear(),
      cursor.getUTCMonth() + INTERVAL_MONTHS,
      1,
    ),
  );
}
const todayStr = today.toISOString().slice(0, 10);
if (dates[dates.length - 1] !== todayStr) dates.push(todayStr);

// 4. Load existing snapshots, drop placeholders, build resume set.
let snapshots = [];
if (existsSync(SNAPSHOTS_FILE)) {
  snapshots = JSON.parse(readFileSync(SNAPSHOTS_FILE, "utf8"));
}
const before = snapshots.length;
snapshots = snapshots.filter((s) => !s.placeholder);
if (snapshots.length < before) {
  console.error(`dropped ${before - snapshots.length} placeholder rows`);
}
const seen = new Set(snapshots.map((s) => s.date));

function save() {
  snapshots.sort((a, b) => a.date.localeCompare(b.date));
  writeFileSync(
    SNAPSHOTS_FILE,
    JSON.stringify(snapshots, null, 2) + "\n",
  );
}
save();

// 5. Per-file blame counter (streams stdout, never buffers more than a chunk).
function blameFile(sha, file) {
  return new Promise((res) => {
    const child = spawn(
      "git",
      ["-C", REPO_DIR, "blame", "--line-porcelain", sha, "--", file],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    let count = 0;
    let buf = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (AUTHOR_RE.test(line)) count++;
      }
    });
    child.stdout.on("end", () => {
      if (AUTHOR_RE.test(buf)) count++;
      res(count);
    });
    child.on("error", () => res(0));
  });
}

async function blameSha(sha) {
  const lsTree = sh(`git -C "${REPO_DIR}" ls-tree -r --name-only ${sha}`);
  const files = lsTree.split("\n").filter((f) => f && !SKIP_RE.test(f));
  let total = 0;
  let i = 0;
  let done = 0;
  const workers = Array.from({ length: PARALLEL }, async () => {
    while (i < files.length) {
      const idx = i++;
      const c = await blameFile(sha, files[idx]);
      total += c;
      done++;
      if (done % 1000 === 0 || done === files.length) {
        process.stderr.write(
          `    ${done}/${files.length} files · ${total} lines so far\n`,
        );
      }
    }
  });
  await Promise.all(workers);
  return { total, fileCount: files.length };
}

// 6. Walk the dates.
console.error(`\nbackfill: ${dates.length} sample dates`);
console.error(`already have ${snapshots.length} real snapshots`);
console.error("");

for (const date of dates) {
  if (seen.has(date)) {
    console.error(`skip ${date} (already done)`);
    continue;
  }

  let sha = "";
  try {
    sha = sh(
      `git -C "${REPO_DIR}" rev-list -1 --before='${date} 23:59:59' "origin/${defaultBranch}"`,
    ).trim();
  } catch {
    sha = "";
  }
  if (!sha) {
    console.error(`no commit before ${date} — skipping`);
    continue;
  }

  const t0 = Date.now();
  console.error(`${date} (${sha.slice(0, 7)}): blaming...`);
  const { total, fileCount } = await blameSha(sha);
  const dt = ((Date.now() - t0) / 1000).toFixed(0);
  console.error(`  → ${total} lines across ${fileCount} files (${dt}s)`);

  snapshots.push({ date, lines: total, sha: sha.slice(0, 7) });
  seen.add(date);
  save();
}

console.error("\ndone. data/snapshots.json now contains the full timeline.");
