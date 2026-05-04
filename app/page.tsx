import snapshotsData from "@/data/snapshots.json";

type Snapshot = { date: string; lines: number; placeholder?: boolean };

export const dynamic = "force-static";

export default function Home() {
  const snapshots = (snapshotsData as Snapshot[]).slice().sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const latest = snapshots[snapshots.length - 1];
  const first = snapshots[0];
  const delta = latest.lines - first.lines;
  const allPlaceholder = snapshots.every((s) => s.placeholder);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl flex flex-col items-center gap-16">
        <div className="flex flex-col items-center gap-3">
          <div className="text-7xl sm:text-8xl font-medium tabular-nums tracking-tight">
            {latest.lines.toLocaleString()}
          </div>
          <div className="text-xs sm:text-sm text-[var(--muted)] uppercase tracking-[0.2em]">
            lines of toly&rsquo;s code left in solana
          </div>
        </div>

        <Chart snapshots={snapshots} />

        <div className="flex w-full justify-between text-[10px] sm:text-xs text-[var(--muted)] uppercase tracking-[0.18em]">
          <span>since {first.date}</span>
          <span>
            {delta > 0 ? "+" : ""}
            {delta.toLocaleString()} lines
          </span>
          <span>updated {latest.date}</span>
        </div>

        {allPlaceholder && (
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-[0.18em]">
            * placeholder data — awaiting first real snapshot
          </div>
        )}
      </div>

      <footer className="fixed bottom-6 left-0 right-0 flex justify-center text-[10px] text-[var(--muted)] uppercase tracking-[0.18em]">
        <a
          href="https://github.com/anza-xyz/agave"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--foreground)] transition-colors"
        >
          source: anza-xyz/agave
        </a>
      </footer>
    </main>
  );
}

function Chart({ snapshots }: { snapshots: Snapshot[] }) {
  const W = 800;
  const H = 220;
  const PAD_X = 8;
  const PAD_Y = 24;

  const values = snapshots.map((s) => s.lines);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const points = snapshots.map((s, i) => {
    const x =
      PAD_X + (snapshots.length === 1 ? innerW / 2 : (i / (snapshots.length - 1)) * innerW);
    const y = PAD_Y + innerH - ((s.lines - min) / range) * innerH;
    return { x, y, s };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      preserveAspectRatio="none"
      aria-label="lines of toly's code over time"
    >
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={H - PAD_Y}
        y2={H - PAD_Y}
        stroke="var(--line)"
        strokeWidth={1}
      />
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} />
      <circle cx={last.x} cy={last.y} r={3.5} fill="currentColor" />
    </svg>
  );
}
