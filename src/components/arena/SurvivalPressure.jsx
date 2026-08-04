import { useAgentLabels } from "../../hooks/useAgentLabels.js";
import { resolveRestartHonorees } from "./RestartFinale.jsx";

export function SurvivalPressure({ state, honors = null }) {
  const agents = state?.agents || [];
  const { labelOf } = useAgentLabels(agents);
  const turn = state?.game?.currentTurn || 0;
  const living = state?.livingAgentCount ?? agents.filter((a) => a.status === "alive").length ?? 0;
  const finished = state?.game?.status === "finished";
  const pressure = Math.min(100, Math.round((turn / 55) * 70 + Math.max(0, living - 2) * 8));
  const survivalText = state?.narrative?.survival?.summary;
  const projected = state?.projectedSurvival;
  const honorees = finished
    ? resolveRestartHonorees({
        honors,
        agents,
        winnerIds: state?.game?.winnerIds || [],
        labelOf,
      })
    : [];

  if (finished) {
    const fallen = Math.max(0, agents.length - honorees.length);
    return (
      <div className="panel survival-pressure is-finished">
        <div className="pressure-header" style={{ padding: 0, border: "none", marginBottom: "0.35rem" }}>
          <span>Restart</span>
          <span className="tiny">entropy reversed</span>
        </div>
        <p className="tiny" style={{ margin: "0 0 0.65rem" }}>
          The white hole carries the last cradles forward
          {fallen > 0 ? ` — ${fallen} husk${fallen === 1 ? "" : "s"} dissolved into the old thermodynamics.` : "."}
        </p>
        <div className="cradle-afford">
          {honorees.map((h) => (
            <span
              key={h.agentId}
              className={`chip${h.finishRank === 1 ? " honor-anchor" : " honor-co"}`}
              title={`${h.title} — ${h.name}`}
            >
              {h.title} · {h.name.toString().slice(0, 14)}
            </span>
          ))}
          {agents
            .filter((a) => a.status === "dead")
            .map((a) => {
              const name = labelOf(a);
              return (
                <span key={a.id} className="chip fail" title={name}>
                  {name.toString().slice(0, 16)} · husk
                </span>
              );
            })}
        </div>
      </div>
    );
  }

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
        {agents.map((a) => {
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
          const name = labelOf(a);
          return (
            <span key={a.id} className={cls} title={name}>
              {name.toString().slice(0, 16)} · {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
