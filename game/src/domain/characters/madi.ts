import madiDelighted from "../../assets/characters/madi-delighted-v1.webp";
import madiMaster from "../../assets/characters/madi-master-v1.webp";
import madiProcessing from "../../assets/characters/madi-processing-v1.webp";
import type { CharacterContent } from "./types";

export const madiContent = {
  developer: {
    id: "madi",
    name: "Madi",
    role: "Tinkerer",
    passiveName: "Custom Setup",
    passiveRules: "Every AI Assisted card installs Script 1 on its target.",
    startingCardId: "agent-swarm",
    accent: "oklch(0.64 0.2 343)",
    art: {
      idle: madiMaster,
      thinking: madiProcessing,
      success: madiDelighted,
    },
  },
  startingCard: {
    id: "agent-swarm",
    ownerId: "madi",
    name: "Agent Swarm",
    cost: 1,
    kind: "work",
    discipline: "backend",
    amount: 5,
    workKind: "unverified",
    rules: "Backend 5. Unverified.",
    tags: ["character", "ai-assisted"],
  },
  rewardCards: [
    {
      id: "parallel-agents",
      ownerId: "madi",
      name: "Parallel Agents",
      cost: 1,
      kind: "work",
      discipline: "backend",
      amount: 6,
      workKind: "unverified",
      rules: "Backend 6. Unverified.",
      tags: ["character", "ai-assisted", "reward"],
    },
  ],
} as const satisfies CharacterContent<"madi">;
