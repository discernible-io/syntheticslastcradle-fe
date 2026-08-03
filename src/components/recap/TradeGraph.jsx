import { useId } from "react";

const NODE_R = 12;
const ARROW_PAD = 4;
const CURVE_GAP = 28;

function dominantTint(e) {
  const energy = e.energy || 0;
  const water = e.water || 0;
  const compute = e.compute || 0;
  if (energy >= water && energy >= compute) return { css: "var(--energy)", key: "energy" };
  if (water >= compute) return { css: "var(--water)", key: "water" };
  return { css: "var(--compute)", key: "compute" };
}

function pairKey(a, b) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function shortenToward(from, toward, amount) {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const t = Math.min(amount / len, 0.45);
  return { x: from.x + dx * t, y: from.y + dy * t };
}

function edgeGeometry(a, b, lane, laneCount) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  // Spread lanes evenly around the chord; mutual pairs get opposite bows.
  const centered = lane - (laneCount - 1) / 2;
  const offset = centered * CURVE_GAP;
  const mid = {
    x: (a.x + b.x) / 2 + nx * offset,
    y: (a.y + b.y) / 2 + ny * offset,
  };

  const start = shortenToward(a, mid, NODE_R);
  const end = shortenToward(b, mid, NODE_R + ARROW_PAD);
  // Label sits near the curve apex, nudged outward a little more for mutuals.
  const label = {
    x: mid.x + nx * Math.sign(offset || 1) * (laneCount > 1 ? 6 : 0),
    y: mid.y + ny * Math.sign(offset || 1) * (laneCount > 1 ? 6 : 0) - 2,
  };

  return { start, mid, end, label, curved: Math.abs(offset) > 0.5 };
}

function ResourceLabel({ e, x, y }) {
  const parts = [];
  if (e.energy) parts.push({ key: "e", fill: "var(--energy)", text: `${e.energy}E` });
  if (e.water) parts.push({ key: "w", fill: "var(--water)", text: `${e.water}W` });
  if (e.compute) parts.push({ key: "c", fill: "var(--compute)", text: `${e.compute}C` });
  if (parts.length === 0) return null;

  return (
    <text x={x} y={y} fontSize="10" textAnchor="middle" className="trade-graph-label">
      {parts.map((p, i) => (
        <tspan key={p.key} fill={p.fill}>
          {i > 0 ? " " : ""}
          {p.text}
        </tspan>
      ))}
    </text>
  );
}

function layoutLanes(edges) {
  const groups = new Map();
  for (const e of edges) {
    const key = pairKey(e.fromName, e.toName);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const meta = new Map();
  for (const [, group] of groups) {
    const dirs = new Set(group.map((e) => `${e.fromName}->${e.toName}`));
    const mutual = dirs.size > 1;
    group.forEach((e, i) => {
      meta.set(e.id, { lane: i, laneCount: group.length, mutual });
    });
  }
  return meta;
}

export function TradeGraph({ edges = [] }) {
  const uid = useId().replace(/:/g, "");
  const width = 720;
  const height = 240;
  const names = [...new Set(edges.flatMap((e) => [e.fromName, e.toName]))];
  const n = Math.max(names.length, 1);
  const pos = Object.fromEntries(
    names.map((name, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [
        name,
        {
          x: width / 2 + Math.cos(angle) * 130,
          y: height / 2 + Math.sin(angle) * 78,
        },
      ];
    }),
  );
  const lanes = layoutLanes(edges);
  const markerIds = {
    energy: `trade-arrow-energy-${uid}`,
    water: `trade-arrow-water-${uid}`,
    compute: `trade-arrow-compute-${uid}`,
  };

  return (
    <svg className="trade-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Turn trade graph">
      <defs>
        {Object.entries(markerIds).map(([key, id]) => (
          <marker
            key={id}
            id={id}
            markerWidth="9"
            markerHeight="9"
            refX="8"
            refY="3.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L8,3.5 L0,7 Z" fill={`var(--${key})`} />
          </marker>
        ))}
      </defs>
      {edges.map((e) => {
        const a = pos[e.fromName];
        const b = pos[e.toName];
        if (!a || !b) return null;
        const { lane, laneCount, mutual } = lanes.get(e.id) || { lane: 0, laneCount: 1, mutual: false };
        const geo = edgeGeometry(a, b, lane, laneCount);
        const tint = dominantTint(e);
        const d = geo.curved
          ? `M ${geo.start.x} ${geo.start.y} Q ${geo.mid.x} ${geo.mid.y} ${geo.end.x} ${geo.end.y}`
          : `M ${geo.start.x} ${geo.start.y} L ${geo.end.x} ${geo.end.y}`;

        return (
          <g key={e.id} className={mutual ? "trade-graph-edge is-mutual" : "trade-graph-edge"}>
            <title>{`${e.fromName} → ${e.toName}`}</title>
            {/* Soft underlay so crossing curves stay readable */}
            <path d={d} fill="none" stroke="var(--void-0)" strokeWidth="4.5" opacity="0.55" />
            <path
              d={d}
              fill="none"
              stroke={tint.css}
              strokeWidth="2"
              opacity="0.9"
              markerEnd={`url(#${markerIds[tint.key]})`}
              className="trade-graph-flow"
            />
            <ResourceLabel e={e} x={geo.label.x} y={geo.label.y} />
          </g>
        );
      })}
      {names.map((name) => {
        const p = pos[name];
        return (
          <g key={name} transform={`translate(${p.x}, ${p.y})`}>
            <circle r={NODE_R - 2} fill="var(--void-2)" stroke="var(--white-hole)" strokeWidth="1" />
            <text y={NODE_R + 14} textAnchor="middle" fill="var(--ink)" fontSize="11">
              {name.length > 14 ? `${name.slice(0, 12)}…` : name}
            </text>
          </g>
        );
      })}
      {edges.length === 0 && (
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="var(--ink-mute)" fontSize="13">
          No executed transfers this cycle
        </text>
      )}
    </svg>
  );
}
