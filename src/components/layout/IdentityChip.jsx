import { verifyRoditUrl } from "../../config/env.js";

export function IdentityChip({ roditId, displayName, compact = false }) {
  if (!roditId) return null;
  const label = displayName || roditId;
  return (
    <span className="identity-chip" title={`RODiT ${roditId}`}>
      {!compact && <span className="tag">RODiT</span>}
      <span>{compact ? roditId.slice(0, 10) : label}</span>
      <a href={verifyRoditUrl(roditId)} target="_blank" rel="noreferrer">
        verify
      </a>
    </span>
  );
}
