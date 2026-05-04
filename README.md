# deleting toly

A countdown of how many lines of Anatoly Yakovenko's original code are still surviving in [anza-xyz/agave](https://github.com/anza-xyz/agave) (the main Solana validator client).

## How it works

- A nightly GitHub Action clones agave shallowly, runs `git blame --line-porcelain` on every tracked file in parallel, and counts lines whose author matches Toly.
- The count is appended to `data/snapshots.json` and committed back.
- The Next.js page reads that JSON at build time and renders the latest number plus a sparkline of the trend.

## Local snapshot

Requires `git` and `bash`.

```bash
bash scripts/snapshot.sh | node scripts/append.mjs
```

Expect ~10–30 minutes for a cold blame across the whole agave tree. Subsequent runs reuse `/tmp/agave-snapshot`.

## Notes

- agave is a fork of `solana-labs/solana`, so the full git history (including Toly's earliest 2018 commits) is preserved. Blaming agave catches every surviving line he wrote.
- Some pieces have been split out into separate repos (`anza-xyz/solana-sdk`, etc.). For now this only counts agave — easier to maintain and, frankly, funnier.
- Initial `data/snapshots.json` entries are marked `"placeholder": true`. The append script drops them as soon as the first real snapshot lands.

## Deploy

```bash
vercel deploy
```

The frontend is fully static — no runtime server logic needed.
