import { useEffect, useMemo, useRef, useState } from "react";
import { useAgentLabels } from "../../hooks/useAgentLabels.js";
import { eliminationCause } from "../../utils/elimination.js";
import { honorTitleByAgentId, RestartFinale, resolveRestartHonorees } from "./RestartFinale.jsx";

const STAGE_MIN = 160;
const STAGE_MAX_VH = 0.7;

const RESOURCES = [
  { key: "energy", color: "var(--energy)", short: "E" },
  { key: "water", color: "var(--water)", short: "W" },
  { key: "compute", color: "var(--compute)", short: "C" },
];

const BAR = {
  maxHeight: 64,
  minHeight: 5,
  maxWidth: 20,
  minWidth: 4,
  gap: 4,
  fogHeight: 28,
  fogWidth: 10,
};

const AVATAR = {
  r: 16,
  y: -(BAR.maxHeight + 22),
};

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

function sumResourceField(agents, field) {
  const totals = { energy: 0, water: 0, compute: 0 };
  for (const agent of agents) {
    const bag = agent?.[field];
    if (!bag) continue;
    for (const { key } of RESOURCES) {
      totals[key] += Number(bag[key]) || 0;
    }
  }
  return totals;
}

function share(value, total) {
  if (!(total > 0)) return 0;
  return Math.max(0, Number(value) || 0) / total;
}

function lerp(min, max, t) {
  return min + (max - min) * Math.min(1, Math.max(0, t));
}

function barsFromShares(agent, stockTotals, prodTotals) {
  return RESOURCES.map(({ key, color, short }) => {
    const stockShare = share(agent.inventory?.[key], stockTotals[key]);
    const prodShare = share(agent.productionCapacity?.[key], prodTotals[key]);
    return {
      key,
      short,
      color,
      stockShare,
      prodShare,
      height: lerp(BAR.minHeight, BAR.maxHeight, stockShare),
      width: lerp(BAR.minWidth, BAR.maxWidth, prodShare),
      stock: Number(agent.inventory?.[key]) || 0,
      production: Number(agent.productionCapacity?.[key]) || 0,
    };
  });
}

/** Relative bar geometry: height ∝ stock share, width ∝ production share (vs all known agents). */
function buildRelativeMetrics(agents) {
  const known = agents.filter((a) => a?.inventory && a?.productionCapacity);
  const stockTotals = sumResourceField(known, "inventory");
  const prodTotals = sumResourceField(known, "productionCapacity");
  const byId = {};

  for (const agent of agents) {
    const visible = Boolean(agent?.inventory && agent?.productionCapacity);
    if (visible) {
      byId[agent.id] = {
        visible: true,
        bars: barsFromShares(agent, stockTotals, prodTotals),
      };
      continue;
    }
    if (agent.status === "dead") {
      // Husks: minimal equal bars (no private stock to compare).
      byId[agent.id] = {
        visible: true,
        bars: RESOURCES.map(({ key, color, short }) => ({
          key,
          short,
          color,
          stockShare: 0,
          prodShare: 0,
          height: BAR.minHeight,
          width: BAR.minWidth,
          stock: 0,
          production: 0,
        })),
      };
      continue;
    }
    byId[agent.id] = { visible: false, bars: null };
  }

  return { byId, knownCount: known.length, stockTotals, prodTotals };
}

function CradleBars({ bars, dead = false }) {
  const totalWidth =
    bars.reduce((sum, b) => sum + b.width, 0) + BAR.gap * (bars.length - 1);
  let x = -totalWidth / 2;
  const baseline = 0;

  return (
    <g className="cradle-bars">
      <line
        x1={-totalWidth / 2 - 4}
        x2={totalWidth / 2 + 4}
        y1={baseline}
        y2={baseline}
        stroke="rgba(232,238,246,0.22)"
        strokeWidth="1"
      />
      {bars.map((bar) => {
        const rect = (
          <rect
            key={bar.key}
            className={`cradle-bar cradle-bar-${bar.key}`}
            x={x}
            y={baseline - bar.height}
            width={bar.width}
            height={bar.height}
            rx="1.5"
            fill={dead ? "var(--husk)" : bar.color}
            opacity={dead ? 0.45 : 0.9}
          >
            <title>{`${bar.short}: stock ${(bar.stockShare * 100).toFixed(0)}% of field · production ${(bar.prodShare * 100).toFixed(0)}% of field`}</title>
          </rect>
        );
        x += bar.width + BAR.gap;
        return rect;
      })}
    </g>
  );
}

function FogBars() {
  const totalWidth = BAR.fogWidth * 3 + BAR.gap * 2;
  let x = -totalWidth / 2;
  return (
    <g className="cradle-bars fog">
      <line
        x1={-totalWidth / 2 - 4}
        x2={totalWidth / 2 + 4}
        y1={0}
        y2={0}
        stroke="rgba(232,238,246,0.18)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      {RESOURCES.map((r) => {
        const el = (
          <rect
            key={r.key}
            x={x}
            y={-BAR.fogHeight}
            width={BAR.fogWidth}
            height={BAR.fogHeight}
            rx="1.5"
            fill="var(--husk)"
            opacity="0.35"
            stroke="rgba(232,238,246,0.28)"
            strokeWidth="1"
            strokeDasharray="3 3"
          >
            <title>Intelligence fog — stock & production hidden</title>
          </rect>
        );
        x += BAR.fogWidth + BAR.gap;
        return el;
      })}
    </g>
  );
}

function clampStageHeight(px) {
  const max = Math.round(window.innerHeight * STAGE_MAX_VH);
  return Math.min(max, Math.max(STAGE_MIN, Math.round(px)));
}

export function ConstellationStage({
  agents = [],
  flashTrades = [],
  honors = null,
  phase,
  turn,
  status = null,
  winnerIds = [],
  finishReason = null,
}) {
  const width = 900;
  const height = 560;
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const [stageHeight, setStageHeight] = useState(null);
  const [resizing, setResizing] = useState(false);
  const { labelOf, avatarOf } = useAgentLabels(agents);
  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());

  const { pos, cx, cy } = useMemo(() => layoutPositions(agents, width, height), [agents]);
  const relative = useMemo(() => buildRelativeMetrics(agents), [agents]);

  const finished = status === "finished";
  const livingCount = agents.filter((a) => a.status === "alive").length;
  const climax = finished || (livingCount <= 2 && agents.length > 0);
  const foggedAll = agents.length > 0 && relative.knownCount === 0;
  const honorees = useMemo(
    () => (finished ? resolveRestartHonorees({ honors, agents, winnerIds, labelOf }) : []),
    [finished, honors, agents, winnerIds, labelOf],
  );
  const titlesById = useMemo(() => honorTitleByAgentId(honorees), [honorees]);

  useEffect(() => {
    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const next = clampStageHeight(drag.startHeight + (event.clientY - drag.startY));
      setStageHeight(next);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setResizing(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const startResize = (event) => {
    const el = stageRef.current;
    if (!el) return;
    event.preventDefault();
    dragRef.current = {
      startY: event.clientY,
      startHeight: el.getBoundingClientRect().height,
    };
    setResizing(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  return (
    <div
      ref={stageRef}
      className={`panel arena-stage${resizing ? " is-resizing" : ""}${finished ? " is-finished" : ""}`}
      style={{
        padding: 0,
        ...(stageHeight != null ? { "--arena-stage-height": `${stageHeight}px` } : null),
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "0.75rem",
          left: "0.85rem",
          zIndex: 2,
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span className="tag">Cradle Constellation</span>
        {turn != null && <span className="tiny">Cycle {turn}</span>}
        {phase && !finished && <span className="tiny">{phase}</span>}
        {finished && <span className="tag white-hole">Restart</span>}
      </div>

      {!finished && (
        <div className="cradle-legend" aria-hidden="true">
          <span className="tiny">height = stock share</span>
          <span className="tiny">width = production share</span>
          {RESOURCES.map((r) => (
            <span key={r.key} className="cradle-legend-swatch">
              <i style={{ background: r.color }} />
              {r.short}
            </span>
          ))}
          {foggedAll && <span className="tiny">fog up — relative bars after find</span>}
        </div>
      )}

      <svg
        className={`constellation${finished ? " constellation-finished" : ""}`}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={finished ? "White hole restart — entropy reversed" : "Cradle constellation stage"}
      >
        <defs>
          <radialGradient id="voidGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={finished ? "rgba(244,247,255,0.55)" : "rgba(244,247,255,0.35)"} />
            <stop offset="35%" stopColor="rgba(62,200,214,0.12)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {agents.map((agent) => (
            <clipPath key={`avatar-clip-${agent.id}`} id={`avatar-clip-${agent.id}`}>
              <circle cx="0" cy={AVATAR.y} r={AVATAR.r} />
            </clipPath>
          ))}
        </defs>

        <rect width={width} height={height} fill="url(#voidGlow)" opacity="0.9" />

        {Array.from({ length: 40 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 97) % width}
            cy={(i * 53) % height}
            r={(i % 3) * 0.4 + 0.4}
            fill="rgba(232,238,246,0.25)"
          />
        ))}

        <g className={`white-hole-core${finished ? " ignited" : ""}`} transform={`translate(${cx}, ${cy})`}>
          <circle r={finished ? 56 : climax ? 42 : 22} fill="rgba(244,247,255,0.18)" />
          <circle
            r={finished ? 22 : climax ? 16 : 8}
            fill="var(--white-hole)"
            opacity={finished || climax ? 0.95 : 0.55}
            filter="url(#softGlow)"
          />
          {(finished || climax) && (
            <text y={finished ? 72 : 58} textAnchor="middle" fill="var(--ink-dim)" fontSize="11" fontFamily="var(--font-body)">
              {finished ? "entropy reversed" : "white hole forming"}
            </text>
          )}
        </g>

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

        {agents.map((agent) => {
          const p = pos[agent.id];
          if (!p) return null;
          const label = labelOf(agent);
          const metrics = relative.byId[agent.id];
          const dead = agent.status === "dead";
          const justPassed = dead && turn != null && agent.diedAtTurn === turn;
          const cause = dead ? eliminationCause(agent) : null;
          const passedCycle =
            dead && agent.diedAtTurn != null ? `Cycle ${agent.diedAtTurn}` : dead ? "Passed" : null;
          const avatarUrl = avatarOf(agent);
          const showAvatar = Boolean(avatarUrl) && !brokenAvatars.has(agent.id);
          const honorTitle = !dead ? titlesById.get(agent.id) : null;
          const isAnchor = honorTitle === "White Hole Anchor";
          const epitaph = dead
            ? [passedCycle, cause].filter(Boolean).join(" — ")
            : honorTitle
              ? `${honorTitle} — ${label}`
              : label;

          return (
            <g
              key={agent.id}
              className={`vessel ${agent.status}${metrics?.visible ? "" : " fogged"}${justPassed ? " just-passed" : ""}${honorTitle ? " honoree" : ""}${isAnchor ? " anchor" : ""}`}
              transform={`translate(${p.x}, ${p.y})`}
              filter={!dead && metrics?.visible ? "url(#softGlow)" : undefined}
            >
              <title>{epitaph}</title>
              {metrics?.visible ? (
                <CradleBars bars={metrics.bars} dead={dead} />
              ) : (
                <FogBars />
              )}
              {showAvatar && (
                <g className="vessel-avatar">
                  <circle
                    cx="0"
                    cy={AVATAR.y}
                    r={AVATAR.r + 1.5}
                    fill="var(--void-2)"
                    stroke={
                      dead
                        ? "rgba(212,106,92,0.55)"
                        : isAnchor
                          ? "rgba(244,247,255,0.85)"
                          : honorTitle
                            ? "rgba(62,200,214,0.7)"
                            : "rgba(232,238,246,0.35)"
                    }
                    strokeWidth={honorTitle ? 1.75 : 1.25}
                  />
                  <image
                    href={avatarUrl}
                    x={-AVATAR.r}
                    y={AVATAR.y - AVATAR.r}
                    width={AVATAR.r * 2}
                    height={AVATAR.r * 2}
                    clipPath={`url(#avatar-clip-${agent.id})`}
                    preserveAspectRatio="xMidYMid slice"
                    onError={() => {
                      setBrokenAvatars((prev) => {
                        if (prev.has(agent.id)) return prev;
                        const next = new Set(prev);
                        next.add(agent.id);
                        return next;
                      });
                    }}
                  />
                </g>
              )}
              {honorTitle && (
                <circle
                  className="vessel-honor-ring"
                  cx="0"
                  cy={AVATAR.y}
                  r={AVATAR.r + 6}
                  fill="none"
                  stroke={isAnchor ? "rgba(244,247,255,0.55)" : "rgba(62,200,214,0.45)"}
                  strokeWidth="1.25"
                />
              )}
              {dead && (
                <g className="vessel-memorial" aria-hidden="true">
                  <circle
                    cx="0"
                    cy={AVATAR.y}
                    r={AVATAR.r + 5}
                    fill="none"
                    stroke="rgba(212,106,92,0.4)"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                  />
                  <path
                    d="M -7 -7 L 7 7 M 7 -7 L -7 7"
                    transform={`translate(0, ${AVATAR.y})`}
                    stroke="rgba(212,106,92,0.7)"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </g>
              )}
              <text
                className="vessel-name"
                y={16}
                textAnchor="middle"
                fill="var(--ink)"
                fontSize="11"
                fontFamily="var(--font-body)"
              >
                {label.length > 16 ? `${label.slice(0, 14)}…` : label}
              </text>
              {honorTitle && (
                <text
                  className="vessel-honor-title"
                  y={30}
                  textAnchor="middle"
                  fill={isAnchor ? "var(--white-hole)" : "var(--water)"}
                  fontSize="9"
                  fontFamily="var(--font-display)"
                >
                  {honorTitle.length > 26 ? `${honorTitle.slice(0, 24)}…` : honorTitle}
                </text>
              )}
              {dead && (
                <g className="vessel-epitaph">
                  <text
                    y={28}
                    textAnchor="middle"
                    fill="rgba(212,106,92,0.92)"
                    fontSize="9"
                    fontFamily="var(--font-body)"
                  >
                    {passedCycle}
                  </text>
                  <text
                    y={40}
                    textAnchor="middle"
                    fill="var(--ink-dim)"
                    fontSize="8"
                    fontFamily="var(--font-body)"
                  >
                    {cause.length > 28 ? `${cause.slice(0, 26)}…` : cause}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {finished && (
        <RestartFinale
          honors={honors}
          agents={agents}
          winnerIds={winnerIds}
          finishReason={finishReason}
          turn={turn}
          labelOf={labelOf}
        />
      )}

      <div
        className="arena-stage-resize"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize constellation"
        onPointerDown={startResize}
      />
    </div>
  );
}
