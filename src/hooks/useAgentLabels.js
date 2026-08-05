import { useEffect, useMemo, useState } from "react";
import { lookupPassportProfile } from "../api/roditLookup.js";
import { agentLabel, agentLabelFromId } from "../utils/agentLabel.js";

function roditKey(agents) {
  return (agents || [])
    .map((a) => a?.roditId)
    .filter(Boolean)
    .map((id) => String(id).toLowerCase())
    .sort()
    .join(",");
}

function roditIdOf(agentOrId, agents) {
  if (agentOrId == null) return "";
  if (typeof agentOrId === "string") {
    const agent = agents.find((a) => a.id === agentOrId);
    return agent?.roditId ? String(agent.roditId).toLowerCase() : "";
  }
  return agentOrId.roditId ? String(agentOrId.roditId).toLowerCase() : "";
}

/** Resolve spectator labels, RODiT portraits, and public contact (email / A2A). */
export function useAgentLabels(agents = []) {
  const key = roditKey(agents);
  const [passportNameByRodit, setPassportNameByRodit] = useState({});
  const [avatarUrlByRodit, setAvatarUrlByRodit] = useState({});
  const [contactByRodit, setContactByRodit] = useState({});

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) {
      setPassportNameByRodit({});
      setAvatarUrlByRodit({});
      setContactByRodit({});
      return undefined;
    }
    const ac = new AbortController();
    (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const profile = await lookupPassportProfile(id, { signal: ac.signal });
            return [id, profile];
          } catch (err) {
            if (err?.name === "AbortError") return null;
            return [id, { name: null, avatarUrl: null, email: null, a2aUrl: null }];
          }
        }),
      );
      if (ac.signal.aborted) return;
      const names = {};
      const avatars = {};
      const contacts = {};
      for (const entry of entries.filter(Boolean)) {
        const [id, profile] = entry;
        if (profile?.name) names[id] = profile.name;
        if (profile?.avatarUrl) avatars[id] = profile.avatarUrl;
        if (profile?.email || profile?.a2aUrl) {
          contacts[id] = {
            email: profile.email || null,
            a2aUrl: profile.a2aUrl || null,
          };
        }
      }
      setPassportNameByRodit(names);
      setAvatarUrlByRodit(avatars);
      setContactByRodit(contacts);
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
    const avatarOf = (agentOrId) => {
      const id = roditIdOf(agentOrId, agents);
      return (id && avatarUrlByRodit[id]) || null;
    };
    const contactOf = (agentOrId) => {
      const id = roditIdOf(agentOrId, agents);
      return (id && contactByRodit[id]) || { email: null, a2aUrl: null };
    };
    return {
      passportNameByRodit,
      avatarUrlByRodit,
      contactByRodit,
      labelOf,
      avatarOf,
      contactOf,
    };
  }, [agents, passportNameByRodit, avatarUrlByRodit, contactByRodit]);
}
