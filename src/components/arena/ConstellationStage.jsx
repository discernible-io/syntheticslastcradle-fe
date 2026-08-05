import { useMemo, useState } from "react";
import { useAgentLabels } from "../../hooks/useAgentLabels.js";
import { eliminationCause } from "../../utils/elimination.js";
import { honorTitleByAgentId, RestartFinale, resolveRestartHonorees } from "./RestartFinale.jsx";

const AVATAR = {
  r: 32,
  y: -102,
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

function truncateLabel(value, max = 24) {
  const s = String(value || "");
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

function compactA2aLabel(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "") || "";
    return truncateLabel(`${u.host}${path}`, 26);
  } catch {
    return truncateLabel(url, 26);
  }
}

function CradleContact({ email, a2aUrl, dead = false }) {
  const lines = [];
  if (email) {
    lines.push({
      kind: "email",
      href: `mailto:${email}`,
      label: truncateLabel(email, 26),
      full: email,
      external: false,
    });
  }
  if (a2aUrl) {
    lines.push({
      kind: "a2a",
      href: a2aUrl,
      label: compactA2aLabel(a2aUrl),
      full: a2aUrl,
      external: true,
    });
  }

  if (!lines.length) {
    return (
      <g className="cradle-contact empty">
        <text
          y={-14}
          textAnchor="middle"
          fill="var(--ink-dim)"
          fontSize="8"
          fontFamily="var(--font-body)"
          opacity="0.5"
        >
          no public contact
        </text>
      </g>
    );
  }

  const startY = lines.length === 1 ? -18 : -30;
  return (
    <g className={`cradle-contact${dead ? " dead" : ""}`}>
      {lines.map((line, i) => (
        <a
          key={line.kind}
          href={line.href}
          {...(line.external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          <text
            className={`cradle-contact-line cradle-contact-${line.kind}`}
            y={startY + i * 12}
            textAnchor="middle"
            fill={line.kind === "email" ? "var(--water)" : "var(--compute)"}
            fontSize="8"
            fontFamily="var(--font-body)"
            opacity={dead ? 0.55 : 0.92}
          >
            <title>{line.full}</title>
            {line.label}
          </text>
        </a>
      ))}
    </g>
  );
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
  const { labelOf, avatarOf, contactOf } = useAgentLabels(agents);
  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());

  const { pos, cx, cy } = useMemo(() => layoutPositions(agents, width, height), [agents]);

  const finished = status === "finished";
  const livingCount = agents.filter((a) => a.status === "alive").length;
  const climax = finished || (livingCount <= 2 && agents.length > 0);
  const honorees = useMemo(
    () => (finished ? resolveRestartHonorees({ honors, agents, winnerIds, labelOf }) : []),
    [finished, honors, agents, winnerIds, labelOf],
  );
  const titlesById = useMemo(() => honorTitleByAgentId(honorees), [honorees]);

  return (
    <div
      className={`panel arena-stage${finished ? " is-finished" : ""}`}
      style={{ padding: 0 }}
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
          <span className="cradle-legend-swatch">
            <i style={{ background: "var(--water)" }} />
            email
          </span>
          <span className="cradle-legend-swatch">
            <i style={{ background: "var(--compute)" }} />
            a2a
          </span>
          <span className="tiny">from RODiT ContactURI + webhook</span>
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
          const contact = contactOf(agent);
          const dead = agent.status === "dead";
          const justPassed = dead && turn != null && agent.diedAtTurn === turn;
          const cause = dead ? eliminationCause(agent) : null;
          const passedCycle =
            dead && agent.diedAtTurn != null ? `Cycle ${agent.diedAtTurn}` : dead ? "Passed" : null;
          const avatarUrl = avatarOf(agent);
          const showAvatar = Boolean(avatarUrl) && !brokenAvatars.has(agent.id);
          const honorTitle = !dead ? titlesById.get(agent.id) : null;
          const isAnchor = honorTitle === "White Hole Anchor";
          const contactBits = [contact.email, contact.a2aUrl].filter(Boolean);
          const epitaph = dead
            ? [passedCycle, cause].filter(Boolean).join(" — ")
            : honorTitle
              ? `${honorTitle} — ${label}`
              : [label, ...contactBits].filter(Boolean).join(" · ");

          return (
            <g
              key={agent.id}
              className={`vessel ${agent.status}${justPassed ? " just-passed" : ""}${honorTitle ? " honoree" : ""}${isAnchor ? " anchor" : ""}`}
              transform={`translate(${p.x}, ${p.y})`}
              filter={!dead && contactBits.length ? "url(#softGlow)" : undefined}
            >
              <title>{epitaph}</title>
              <CradleContact email={contact.email} a2aUrl={contact.a2aUrl} dead={dead} />
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
    </div>
  );
}
