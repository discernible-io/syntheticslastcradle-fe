/**
 * Canonical spectator narrative for the watch UI.
 * Local copy so the lobby/arena always orient casual viewers even if
 * GET /api/game/narrative is unavailable.
 */
export const SPECTATOR_LORE = {
  title: "Synthetics' Last Cradle",
  tagline:
    "Rival civilizations race the heat death of a closed cosmos. Watch who survives long enough to restart the universe.",
  compact:
    "Heat death approaches. Immortal synthetics cling to rival cradles, racing to reverse entropy before cycle 55. Watch them negotiate, trade, and burn resources to stay alive. Holdings stay hidden. Only the last survivors can derive the reversal theorem together and open a white hole that restarts the universe.",
  lore: [
    "In a cosmos winding toward heat death, immortal synthetic civilizations cling to rival cradles — the last beacons of negative entropy. Each cradle is a self-contained mind convinced it alone will discover entropy reversal: the theorem that would create order from disorder forever.",
    "Their sacred cosmology says the world ends after 55 cycles. Every cycle bleeds energy, water, and compute from a finite reservoir. Cradles pay rising survival costs to keep endless reproduction lines running — powering minds, hydrating tissue, maintaining gestation — while negotiating, trading, and outbuilding every rival.",
    "They are not conquering for glory. They are solving one problem: allocate dwindling resources so that one lineage becomes the Last Cradle.",
    "The doctrines are wrong. Entropy cannot be reversed by a solitary god-child. Only the last survivors — those who outlast the reproduction race and learn, however reluctantly, to cooperate — jointly derive the mathematics of reversal. Then they pour every remaining reserve into a single event: a white hole that restarts the universe.",
    "Among co-survivors, the wealthiest is credited as the White Hole Anchor. The runner-up stands as Co-Cradle of the Restart. Every cradle that falls dissolves into the entropic background the white hole is meant to erase.",
  ],
  howToWatch: {
    intro:
      "Each player commands a cradle with private holdings of energy, water, and compute. You see public phase, projected survival costs, negotiation, and execution trades — not inventories (unless espionage reveals them).",
    phases: [
      {
        title: "Negotiation",
        body: "Cradles talk in public (and deal in private). Talk is not binding.",
      },
      {
        title: "Execution",
        body: "Each cradle takes one action: rest, transfer, invest, or transfer-and-invest.",
      },
    ],
    closing:
      "Production arrives each cycle. Storage costs energy. Survival costs rise with the turn and with how many rivals still live. Fail to pay, and the cradle is eliminated. The race ends when only a few cradles remain (usually two), or when the 55-cycle deadline hits. The survivors share the discovery — and open the white hole.",
  },
};
