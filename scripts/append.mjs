#!/usr/bin/env node
// Reads one snapshot JSON object from stdin and appends to data/snapshots.json.
// If today already has an entry, replaces it. Drops `placeholder: true` rows
// once any real snapshot lands.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dirname, "..", "data", "snapshots.json");

const stdin = readFileSync(0, "utf8").trim();
if (!stdin) {
  console.error("append.mjs: no snapshot on stdin");
  process.exit(1);
}
const incoming = JSON.parse(stdin);
if (typeof incoming.date !== "string" || typeof incoming.lines !== "number") {
  console.error("append.mjs: invalid snapshot:", incoming);
  process.exit(1);
}

const existing = JSON.parse(readFileSync(FILE, "utf8"));
const real = existing.filter((s) => !s.placeholder);
const withoutToday = real.filter((s) => s.date !== incoming.date);
const next = [...withoutToday, incoming].sort((a, b) =>
  a.date.localeCompare(b.date),
);

writeFileSync(FILE, JSON.stringify(next, null, 2) + "\n");
console.log(`appended ${incoming.date}: ${incoming.lines} lines (sha ${incoming.sha ?? "?"})`);
