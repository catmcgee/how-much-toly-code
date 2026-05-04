#!/usr/bin/env bash
# Count surviving lines authored by Anatoly Yakovenko in the agave repo.
# Outputs JSON to stdout: {"date":"YYYY-MM-DD","lines":N,"sha":"..."}
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/anza-xyz/agave.git}"
REPO_DIR="${REPO_DIR:-/tmp/agave-snapshot}"
PARALLEL="${PARALLEL:-8}"

# Pattern matches Toly across his various commit identities. Run against the
# `author` line of `git blame --line-porcelain` (NOT `author-mail`, since some
# of his commits use co-author or different emails over the years).
AUTHOR_PATTERN='^author Anatoly[ -]?Yakovenko'

if [ ! -d "$REPO_DIR/.git" ]; then
  rm -rf "$REPO_DIR"
  git clone --depth=1 --filter=blob:none "$REPO_URL" "$REPO_DIR" >&2
else
  git -C "$REPO_DIR" fetch --depth=1 origin >&2
  git -C "$REPO_DIR" reset --hard origin/HEAD >&2
fi

cd "$REPO_DIR"

SHA=$(git rev-parse --short HEAD)

# Build list of files worth blaming. Skip lockfiles, vendored data, binaries.
mapfile -d '' FILES < <(
  git ls-files -z |
  grep -zvE '(^|/)(Cargo\.lock|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$' |
  grep -zvE '\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|gz|tar|wasm|so|dylib|dll|exe)$'
)

export AUTHOR_PATTERN

count_one() {
  git blame --line-porcelain -- "$1" 2>/dev/null |
    grep -cE "$AUTHOR_PATTERN" || true
}
export -f count_one

# Run blame in parallel, sum the per-file counts.
TOTAL=$(
  printf '%s\0' "${FILES[@]}" |
  xargs -0 -n 1 -P "$PARALLEL" bash -c 'count_one "$0"' |
  awk '{s+=$1} END {print s+0}'
)

DATE=$(date -u +"%Y-%m-%d")

printf '{"date":"%s","lines":%s,"sha":"%s"}\n' "$DATE" "$TOTAL" "$SHA"
