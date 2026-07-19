import odinMaster from "../../assets/characters/odin-master-v1.webp";
import odinSatisfied from "../../assets/characters/odin-satisfied-v1.webp";
import odinThinking from "../../assets/characters/odin-thinking-v1.webp";
import type { CharacterContent } from "./types";

export const odinContent = {
  developer: {
    id: "odin",
    name: "Odin",
    role: "Architect",
    passiveName: "I Have Concerns",
    passiveRules: "Every Review also Stuns that Task's intent.",
    startingCardId: "design-review",
    accent: "oklch(0.55 0.19 292)",
    art: {
      idle: odinMaster,
      thinking: odinThinking,
      success: odinSatisfied,
    },
  },
  startingCard: {
    id: "design-review",
    ownerId: "odin",
    name: "Design Review",
    cost: 1,
    kind: "review",
    amount: 5,
    rules: "Verify 5 on one Task.",
    tags: ["character", "review"],
  },
  rewardCards: [
    {
      id: "one-more-diagram",
      ownerId: "odin",
      name: "One More Diagram",
      cost: 1,
      kind: "review",
      amount: 6,
      rules: "Verify 6 on one Task.",
      tags: ["character", "review", "reward"],
    },
  ],
} as const satisfies CharacterContent<"odin">;
