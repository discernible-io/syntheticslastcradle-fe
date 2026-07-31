import { useMemo } from "react";

const SPECIALTY_COLOR = {
  energy: "var(--energy)",
  water: "var(--water)",
  compute: "var(--compute)",
};

function vesselScale(agent, honorsMetrics) {
  if (agent.status === "dead") return 0.55;
  const holdings = honorsMetrics?.finalHoldings;
  if (typeof holdings === "number" && holdings > 0) {
    return Math.min(1.45, 0.7 + Math.log10(holdings + 1) * 0.35);
  }
  // Fog: unknown inventory — size from presence only
  return agent.intelligenceHidden ? 0.9 : 1.05;
}

function layoutPositions(agents, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const living = agents.filter((a) => a.status === "alive");
  const dead = agents.filter((a) => a.status === "dead");
  const n = Math.max(living.length, 1);
  const radius = Math.min(width, height) * 0.32;

  const pos = {};
  living.forEach((a, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    pos[a.id] = {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius * 0.85,
    };
  });
  dead.forEach((a, i) => {
    const angle = (Math.PI * 2 * i) / Math.max(dead.length, 1) + Math.PI / 6;
    const r = radius * 1.35;
    pos[a.id] = {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r * 0.75,
    };
  });
  return { pos, cx, cy };
}

export function ConstellationStage({ agents = [], flashTrades = [], honors = null, phase, turn }) {
  const width = 900;
  const height = 560;
  const metricsByAgent = useMemo(() => {
    const map = {};
    for (const h of honors?.honors?.standings || honors?.honors?.honorees || []) {
      map[h.agentId] = h.metrics;
    }
    return map;
  }, [honors]);

  const { pos, cx, cy } = useMemo(() => layoutPositions(agents, width, height), [agents]);

  const livingCount = agents.filter((a) => a.status === "alive").length;
  const climax = livingCount <= 2 && agents.length > 0;

  return (
    <div className="panel arena-stage" style={{ padding: 0 }}>
      <div
        style={{
          position: "absolute",
          top: "0.75rem",
          left: "0.85rem",
          zIndex: 2,
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <span className="tag">Cradle Constellation</span>
        {turn != null && <span className="tiny">Cycle {turn}</span>}
        {phase && <span className="tiny">{phase}</span>}
      </div>
      <svg className="constellation" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cradle constellation stage">
        <defs>
          <radialGradient id="voidGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(244,247,255,0.35)" />
            <stop offset="35%" stopColor="rgba(62,200,214,0.12)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={width} height={height} fill="url(#voidGlow)" opacity="0.9" />

        {/* Fog starfield */}
        {Array.from({ length: 40 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 97) % width}
            cy={(i * 53) % height}
            r={(i % 3) * 0.4 + 0.4}
            fill="rgba(232,238,246,0.25)"
          />
        ))}

        {/* White-hole climax core */}
        <g className="white-hole-core" transform={`translate(${cx}, ${cy})`}>
          <circle r={climax ? 42 : 22} fill="rgba(244,247,255,0.18)" />
          <circle r={climax ? 16 : 8} fill="var(--white-hole)" opacity={climax ? 0.95 : 0.55} filter="url(#softGlow)" />
          {climax && (
            <text y="58" textAnchor="middle" fill="var(--ink-dim)" fontSize="11" fontFamily="var(--font-body)">
              white hole
            </text>
          )}
        </g>

        {/* Trade arcs */}
        {flashTrades.map((t) => {
          const a = pos[t.fromAgentId];
          const b = pos[t.toAgentId];
          if (!a || !b) return null;
          const midX = (a.x + b.x) / 2 + (b.y - a.y) * 0.12;
          const midY = (a.y + b.y) / 2 - (b.x - a.x) * 0.12;
          const tint =
            (t.energy || 0) >= (t.water || 0) && (t.energy || 0) >= (t.compute || 0)
              ? "var(--energy)"
              : (t.water || 0) >= (t.compute || 0)
                ? "var(--water)"
                : "var(--compute)";
          return (
            <path
              key={t.id}
              className="trade-arc"
              d={`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`}
              fill="none"
              stroke={tint}
              strokeWidth="2"
              opacity="0.85"
            />
          );
        })}

        {/* Vessels */}
        {agents.map((agent) => {
          const p = pos[agent.id];
          if (!p) return null;
          const scale = vesselScale(agent, metricsByAgent[agent.id]);
          const specialty = agent.specialty;
          const color = SPECIALTY_COLOR[specialty] || "var(--white-hole)";
          const hidden = agent.intelligenceHidden && agent.status === "alive" && !agent.inventory;
          const r = 16 * scale;
          const label = agent.displayName || agent.roditId || agent.id.slice(0, 6);

          return (
            <g
              key={agent.id}
              className={`vessel ${agent.status}`}
              transform={`translate(${p.x}, ${p.y})`}
              filter={agent.status === "alive" ? "url(#softGlow)" : undefined}
            >
              {hidden ? (
                <>
                  <circle r={r} fill="var(--husk)" opacity="0.55" />
                  <circle r={r} fill="none" stroke="rgba(232,238,246,0.25)" strokeDasharray="3 4" />
                </>
              ) : agent.status === "dead" ? (
                <>
                  <circle r={r * 0.7} fill="var(--husk)" opacity="0.5" />
                  <path
                    d={`M ${-r * 0.5} ${-r * 0.5} L ${r * 0.5} ${r * 0.5} M ${r * 0.5} ${-r * 0.5} L ${-r * 0.5} ${r * 0.5}`}
                    stroke="rgba(212,106,92,0.55)"
                    strokeWidth="1.5"
                  />
                </>
              ) : (
                <>
                  <circle r={r * 1.35} fill={color} opacity="0.15" />
                  <circle r={r} fill={color} opacity="0.85" />
                  <circle r={r * 0.35} fill="var(--white-hole)" opacity="0.9" />
                </>
              )}
              <text
                y={r + 14}
                textAnchor="middle"
                fill="var(--ink)"
                fontSize="11"
                fontFamily="var(--font-body)"
              >
                {label.length > 16 ? `${label.slice(0, 14)}…` : label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
