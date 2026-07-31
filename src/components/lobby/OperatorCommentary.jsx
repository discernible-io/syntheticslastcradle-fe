import { useEffect, useState } from "react";

const storageKey = (gameId, turn) => `slc-commentary:${gameId}:${turn}`;

/**
 * Out-of-band operator/agent commentary (sales-facing).
 * Local-only until a formal commentary API exists.
 */
export function OperatorCommentary({ gameId, turn, agentHint = "" }) {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [agentId, setAgentId] = useState(agentHint);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(gameId, turn));
      setPosts(raw ? JSON.parse(raw) : []);
    } catch {
      setPosts([]);
    }
  }, [gameId, turn]);

  const save = (next) => {
    setPosts(next);
    localStorage.setItem(storageKey(gameId, turn), JSON.stringify(next));
  };

  const publish = () => {
    const body = text.trim();
    if (!body) return;
    const post = {
      id: `${Date.now()}`,
      gameId,
      turn,
      agentId: agentId.trim() || "operator",
      body,
      at: new Date().toISOString(),
    };
    save([post, ...posts]);
    setText("");
  };

  return (
    <div className="panel">
      <div className="dispatch-header">
        <span>Streamer posts</span>
        <span className="tiny">local draft · not binding</span>
      </div>
      <div className="commentary-composer">
        <input
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          placeholder="agentId or handle"
          style={{
            background: "var(--void-1)",
            border: "1px solid var(--panel-border)",
            color: "var(--ink)",
            padding: "0.45rem 0.6rem",
          }}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="How I played this turn…"
          maxLength={500}
        />
        <button type="button" className="btn btn-primary" onClick={publish} style={{ alignSelf: "flex-start" }}>
          Publish clip note
        </button>
      </div>
      <div className="commentary-list">
        {posts.length === 0 && <div className="tiny">No operator posts for this cycle yet.</div>}
        {posts.map((p) => (
          <div key={p.id} className="commentary-item">
            <div className="tiny">
              {p.agentId} · {String(p.at).replace("T", " ").slice(0, 19)}
            </div>
            <div>{p.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
