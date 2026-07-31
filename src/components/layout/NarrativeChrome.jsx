export function NarrativeChrome({ narrative, compact = false }) {
  if (!narrative) return null;
  const title = narrative.title || "Synthetics' Last Cradle";
  const line = compact
    ? narrative.beliefs || narrative.premise
    : narrative.conflict || narrative.premise;
  return (
    <aside className="panel" style={{ padding: "0.85rem 1rem", marginBottom: "1rem" }}>
      <div className="tiny" style={{ marginBottom: "0.25rem" }}>
        Lore · {narrative.version || "narrative"}
      </div>
      <div style={{ fontFamily: "var(--font-display)", marginBottom: "0.35rem" }}>{title}</div>
      <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
        {typeof line === "string" ? line.slice(0, compact ? 220 : 420) : null}
        {typeof line === "string" && line.length > (compact ? 220 : 420) ? "…" : ""}
      </p>
    </aside>
  );
}
