import ireneFixed from "../../assets/characters/irene-fixed-v1.webp";
import ireneMaster from "../../assets/characters/irene-master-v1.webp";
import ireneThinking from "../../assets/characters/irene-thinking-v1.webp";
import type { CharacterContent } from "./types";

export const ireneContent = {
  developer: {
    id: "irene",
    name: "Irene",
    role: "Quiet Assassin",
    passiveName: "Quietly Done",
    passiveRules: "Whenever Verified Work completes a requirement, draw 1 card.",
    startingCardId: "already-fixed",
    accent: "oklch(0.61 0.14 167)",
    art: {
      idle: ireneMaster,
      thinking: ireneThinking,
      success: ireneFixed,
    },
  },
  startingCard: {
    id: "already-fixed",
    ownerId: "irene",
    name: "Already Fixed",
    cost: 1,
    kind: "work",
    discipline: "flexible",
    amount: 3,
    workKind: "verified",
    rules: "Any 3. Verified.",
    tags: ["character", "flexible"],
  },
  rewardCards: [
    {
      id: "quietly-automated",
      ownerId: "irene",
      name: "Quietly Automated",
      cost: 1,
      kind: "work",
      discipline: "flexible",
      amount: 1,
      workKind: "verified",
      automation: { kind: "install", power: 1 },
      rules: "Any 1. Install Script 1.",
      tags: ["character", "automation", "flexible", "reward"],
    },
  ],
} as const satisfies CharacterContent<"irene">;
