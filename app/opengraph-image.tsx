import { ImageResponse } from "next/og";
import snapshotsData from "@/data/snapshots.json";

type Snapshot = { date: string; lines: number };

export const alt = "lines of toly's code left in solana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const snapshots = (snapshotsData as Snapshot[])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const latest = snapshots[snapshots.length - 1];
  const peak = Math.max(...snapshots.map((s) => s.lines));
  const dropPct = Math.round(((peak - latest.lines) / peak) * 100);

  const W = 1080;
  const H = 200;
  const PAD = 4;
  const min = Math.min(...snapshots.map((s) => s.lines));
  const range = peak - min || 1;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const points = snapshots.map((s, i) => ({
    x: PAD + (i / (snapshots.length - 1)) * innerW,
    y: PAD + innerH - ((s.lines - min) / range) * innerH,
  }));
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          color: "#ededed",
          padding: "56px 60px",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#a3a3a3",
            textTransform: "uppercase",
            letterSpacing: 5,
          }}
        >
          deleting toly
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 220,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: -8,
            }}
          >
            {latest.lines.toLocaleString()}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#a3a3a3",
              textTransform: "uppercase",
              letterSpacing: 6,
              marginTop: 24,
            }}
          >
            lines of toly&rsquo;s code left in solana
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ display: "block" }}
          >
            <line
              x1={PAD}
              y1={H - PAD}
              x2={W - PAD}
              y2={H - PAD}
              stroke="#1f1f1f"
              strokeWidth={1}
            />
            <path d={path} fill="none" stroke="#ededed" strokeWidth={2.5} />
            <circle cx={last.x} cy={last.y} r={6} fill="#ededed" />
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 18,
              fontSize: 18,
              color: "#a3a3a3",
              textTransform: "uppercase",
              letterSpacing: 4,
            }}
          >
            <div style={{ display: "flex" }}>
              {snapshots[0].date.slice(0, 4)}
            </div>
            <div style={{ display: "flex" }}>
              peak {peak.toLocaleString()} &middot; down {dropPct}% from peak
            </div>
            <div style={{ display: "flex" }}>{latest.date.slice(0, 4)}</div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
