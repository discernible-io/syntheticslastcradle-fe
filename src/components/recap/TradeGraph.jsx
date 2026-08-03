function dominantTint(e) {
  const energy = e.energy || 0;
  const water = e.water || 0;
  const compute = e.compute || 0;
  if (energy >= water && energy >= compute) return "var(--energy)";
  if (water >= compute) return "var(--water)";
  return "var(--compute)";
}

function ResourceLabel({ e, x, y }) {
  const parts = [];
  if (e.energy) parts.push({ key: "e", fill: "var(--energy)", text: `${e.energy}E` });
  if (e.water) parts.push({ key: "w", fill: "var(--water)", text: `${e.water}W` });
  if (e.compute) parts.push({ key: "c", fill: "var(--compute)", text: `${e.compute}C` });
  if (parts.length === 0) return null;

  return (
    <text x={x} y={y} fontSize="10" textAnchor="middle">
      {parts.map((p, i) => (
        <tspan key={p.key} fill={p.fill}>
          {i > 0 ? " " : ""}
          {p.text}
        </tspan>
      ))}
    </text>
  );
}

export function TradeGraph({ edges = [] }) {
  const width = 720;
  const height = 220;
  const names = [...new Set(edges.flatMap((e) => [e.fromName, e.toName]))];
  const n = Math.max(names.length, 1);
  const pos = Object.fromEntries(
    names.map((name, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [
        name,
        {
          x: width / 2 + Math.cos(angle) * 120,
          y: height / 2 + Math.sin(angle) * 70,
        },
      ];
    }),
  );

  return (
    <svg className="trade-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Turn trade graph">
      <defs>
        <marker id="trade-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-dim)" />
        </marker>
      </defs>
      {edges.map((e) => {
        const a = pos[e.fromName];
        const b = pos[e.toName];
        if (!a || !b) return null;
        return (
          <g key={e.id}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={dominantTint(e)}
              strokeWidth="1.5"
              opacity="0.75"
              markerEnd="url(#trade-arrow)"
            />
            <ResourceLabel e={e} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} />
          </g>
        );
      })}
      {names.map((name) => {
        const p = pos[name];
        return (
          <g key={name} transform={`translate(${p.x}, ${p.y})`}>
            <circle r="10" fill="var(--void-2)" stroke="var(--white-hole)" strokeWidth="1" />
            <text y="24" textAnchor="middle" fill="var(--ink)" fontSize="11">
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
