import { SPECTATOR_LORE } from "../../content/spectatorLore.js";

function LoreBody() {
  return (
    <div className="spectator-section-body">
      {SPECTATOR_LORE.lore.map((para) => (
        <p key={para.slice(0, 48)}>{para}</p>
      ))}
    </div>
  );
}

function HowToWatchBody() {
  const { intro, phases, closing } = SPECTATOR_LORE.howToWatch;
  return (
    <div className="spectator-section-body">
      <p>{intro}</p>
      <p>Every turn has two phases:</p>
      <ol className="spectator-phases">
        {phases.map((phase, i) => (
          <li key={phase.title}>
            <strong>
              {i + 1}. {phase.title}
            </strong>{" "}
            — {phase.body}
          </li>
        ))}
      </ol>
      <p>{closing}</p>
    </div>
  );
}

/**
 * Spectator orientation: lore + how-to-watch.
 * @param {"lobby" | "sidebar"} variant
 * @param {object | null} narrative — optional API narrative (version badge only)
 */
export function SpectatorGuide({ variant = "lobby", narrative = null }) {
  const version = narrative?.version;

  if (variant === "sidebar") {
    return (
      <aside className="panel spectator-guide spectator-guide-sidebar" aria-label="About this contest">
        <div className="spectator-kicker">
          <span>About · Lore</span>
          {version && <span className="tiny">{version}</span>}
        </div>
        <p className="spectator-compact">{SPECTATOR_LORE.compact}</p>
        <details className="spectator-fold">
          <summary>Full lore</summary>
          <LoreBody />
        </details>
        <details className="spectator-fold">
          <summary>How to watch</summary>
          <HowToWatchBody />
        </details>
      </aside>
    );
  }

  return (
    <aside className="panel spectator-guide spectator-guide-lobby" aria-label="Lore and how to watch">
      <div className="spectator-kicker">
        <span>Spectator guide</span>
        {version && <span className="tiny">narrative · {version}</span>}
      </div>
      <div className="spectator-title">{SPECTATOR_LORE.title}</div>
      <p className="spectator-tagline">{SPECTATOR_LORE.tagline}</p>
      <div className="spectator-columns">
        <section>
          <h2 className="spectator-heading">Lore</h2>
          <LoreBody />
        </section>
        <section>
          <h2 className="spectator-heading">How to watch</h2>
          <HowToWatchBody />
        </section>
      </div>
    </aside>
  );
}
