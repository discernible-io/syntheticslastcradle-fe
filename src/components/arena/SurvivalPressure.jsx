export function SurvivalPressure({ state }) {
  const turn = state?.game?.currentTurn || 0;
  const living = state?.livingAgentCount ?? state?.agents?.filter((a) => a.status === "alive").length ?? 0;
  const pressure = Math.min(100, Math.round((turn / 55) * 70 + Math.max(0, living - 2) * 8));
  const survivalText = state?.narrative?.survival?.summary;
  const projected = state?.projectedSurvival;

  return (
    <div className="panel survival-pressure">
      <div className="pressure-header" style={{ padding: 0, border: "none", marginBottom: "0.35rem" }}>
        <span>Survival pressure</span>
        <span className="tiny">{living} living</span>
      </div>
      <div className="pressure-meter" aria-label={`Pressure ${pressure}%`}>
        <span style={{ width: `${pressure}%` }} />
      </div>
      {survivalText && (
        <p className="tiny" style={{ margin: "0 0 0.65rem" }}>
          {survivalText.slice(0, 220)}
          {survivalText.length > 220 ? "…" : ""}
        </p>
      )}
      <div className="cradle-afford">
        {(state?.agents || []).map((a) => {
          const cost = projected?.[a.id];
          let cls = "chip";
          let label = a.status === "dead" ? "husk" : "fog";
          if (a.status === "dead") cls += " fail";
          else if (cost) {
            // Spectator fog: we only know projected cost, not inventory mid-game
            label = "cost known";
            cls += " tight";
          } else if (a.status === "alive") {
            cls += " ok";
            label = "alive";
          }
          return (
            <span key={a.id} className={cls} title={a.displayName || a.roditId}>
              {(a.displayName || a.roditId || a.id).toString().slice(0, 12)} · {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
