import { useState } from "react";
import { IdentityChip } from "../layout/IdentityChip.jsx";
import { useAgentLabels } from "../../hooks/useAgentLabels.js";

function initials(name) {
  if (!name) return "?";
  return String(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function DispatchFeed({ messages = [], agents = [], turn }) {
  const byId = Object.fromEntries(agents.map((a) => [a.id, a]));
  const { labelOf, avatarOf } = useAgentLabels(agents);
  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());

  return (
    <div className="panel dispatch">
      <div className="dispatch-header">
        <span>Dispatch</span>
        <span className="tiny">turn {turn ?? "—"} · public</span>
      </div>
      <div className="dispatch-list">
        {messages.length === 0 && <div className="empty-state">No public messages this cycle.</div>}
        {[...messages].reverse().map((m) => {
          const agentId = m.from_agent_id || m.fromAgentId;
          const agent = byId[agentId];
          const name = labelOf(agent || agentId);
          const avatarUrl = avatarOf(agent || agentId);
          const showAvatar = Boolean(avatarUrl) && !brokenAvatars.has(agentId);
          const ts = m.created_at || m.createdAt;
          return (
            <article key={m.id} className="dispatch-item">
              <div className="dispatch-avatar" style={{ color: "var(--water)" }}>
                {showAvatar ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    onError={() => {
                      setBrokenAvatars((prev) => {
                        if (prev.has(agentId)) return prev;
                        const next = new Set(prev);
                        next.add(agentId);
                        return next;
                      });
                    }}
                  />
                ) : (
                  initials(name)
                )}
              </div>
              <div className="dispatch-meta">
                <span className="name">{name}</span>
                {agent?.roditId && <IdentityChip roditId={agent.roditId} displayName={name} compact />}
                {ts && <span className="tiny">{String(ts).replace("T", " ").slice(0, 19)}</span>}
              </div>
              <div className="dispatch-body">{m.body}</div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
