import { useEffect, useMemo, useState } from "react";
import { lookupPassportDisplayName } from "../api/roditLookup.js";
import { agentLabel, agentLabelFromId } from "../utils/agentLabel.js";

function roditKey(agents) {
  return (agents || [])
    .map((a) => a?.roditId)
    .filter(Boolean)
    .map((id) => String(id).toLowerCase())
    .sort()
    .join(",");
}

/** Resolve spectator labels: passport NNSWF+NSWF when available, else joining id. */
export function useAgentLabels(agents = []) {
  const key = roditKey(agents);
  const [passportNameByRodit, setPassportNameByRodit] = useState({});

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) {
      setPassportNameByRodit({});
      return undefined;
    }
    const ac = new AbortController();
    (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const name = await lookupPassportDisplayName(id, { signal: ac.signal });
            return name ? [id, name] : null;
          } catch (err) {
            if (err?.name === "AbortError") return null;
            return null;
          }
        }),
      );
      if (ac.signal.aborted) return;
      setPassportNameByRodit(Object.fromEntries(entries.filter(Boolean)));
    })();
    return () => ac.abort();
  }, [key]);

  return useMemo(() => {
    const labelOf = (agentOrId) => {
      if (agentOrId == null) return "";
      if (typeof agentOrId === "string") {
        return agentLabelFromId(agentOrId, agents, passportNameByRodit);
      }
      return agentLabel(agentOrId, passportNameByRodit);
    };
    return { passportNameByRodit, labelOf };
  }, [agents, passportNameByRodit]);
}
