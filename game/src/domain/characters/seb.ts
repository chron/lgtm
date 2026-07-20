import sebIdle from "../../assets/characters/seb-idle-v1.webp";
import sebSuccess from "../../assets/characters/seb-success-v1.webp";
import sebThinking from "../../assets/characters/seb-thinking-v1.webp";
import type { CharacterContent } from "./types";

/**
 * Seb's locked first-pass catalogue.
 *
 * This deliberately stays structurally typed until the shared roster/lifecycle
 * foundations add Seb to DeveloperId and the new packet-effect fields to
 * CardDefinition. Keeping the catalogue isolated lets that integration be one
 * boring import instead of eight characters fighting over the same model file.
 */
export const sebContent = {
  developer: {
    id: "seb",
    name: "Seb",
    role: "Design System",
    passiveName: "Shared Components",
    passiveRules:
      "Verified Frontend completions add 1 Verified Frontend Work to every other open Task.",
    startingCardId: "use-the-component",
    accent: "oklch(0.67 0.18 54)",
    art: {
      idle: sebIdle,
      thinking: sebThinking,
      success: sebSuccess,
    },
  },
  startingCard: {
    id: "use-the-component",
    ownerId: "seb",
    name: "Use the Component",
    cost: 1,
    kind: "work",
    discipline: "frontend",
    amount: 4,
    workKind: "verified",
    frontendSpreadToOtherTasks: 1,
    display: { value: "4", label: "Frontend", rules: "Verified. Spread 1." },
    rules: "Frontend 4. Verified. Then add Frontend 1 to every other open Task.",
    tags: ["character"],
  },
  rewardCards: [
    {
      id: "design-tokens",
      ownerId: "seb",
      name: "Design Tokens",
      cost: 1,
      kind: "tactic",
      amount: 0,
      frontendWorkToEveryTask: 2,
      exhaust: true,
      display: { value: "2", label: "Every Task", rules: "Frontend. Verified. Exhaust." },
      rules: "Add 2 Verified Frontend Work to every open Task. Exhaust.",
      tags: ["character", "exhaust", "reward"],
      rarity: "normal",
    },
    {
      id: "ladle",
      ownerId: "seb",
      name: "Ladle",
      cost: 1,
      kind: "work",
      discipline: "frontend",
      amount: 2,
      workKind: "verified",
      automation: { kind: "install", power: 1 },
      display: { value: "2", label: "Frontend", rules: "Verified. Install Script 1." },
      rules: "Frontend 2. Verified. Install Script 1 there.",
      tags: ["automation", "character", "reward"],
      rarity: "normal",
    },
    {
      id: "extract-component",
      ownerId: "seb",
      name: "Extract Component",
      cost: 1,
      kind: "work",
      discipline: "frontend",
      amount: 4,
      workKind: "verified",
      extraSharedComponentsOnCompletion: 1,
      display: { value: "4", label: "Frontend", rules: "Complete: echo again." },
      rules: "Frontend 4. Verified. If it completes, trigger Shared Components again.",
      tags: ["character", "reward"],
      rarity: "normal",
    },
    {
      id: "used-everywhere",
      ownerId: "seb",
      name: "Used Everywhere",
      cost: 1,
      kind: "work",
      discipline: "frontend",
      amount: 2,
      workKind: "verified",
      workPerOtherIncompleteFrontendTask: 2,
      display: { value: "2+", label: "Frontend", rules: "+2 per other Frontend Task." },
      rules: "Frontend 2, plus 2 per other open Task with incomplete Frontend. Verified.",
      tags: ["character", "reward"],
      rarity: "normal",
    },
    {
      id: "polish-the-primitives",
      ownerId: "seb",
      name: "Polish the Primitives",
      cost: 1,
      kind: "review",
      amount: 4,
      frontendSpreadIfTaskClean: 2,
      display: { value: "4", label: "Verify", rules: "Clean: spread Frontend 2." },
      rules: "Verify 4. If no Unverified Work remains, spread Frontend 2 to other Tasks.",
      tags: ["character", "review", "reward"],
      rarity: "normal",
    },
    {
      id: "design-system-migration",
      ownerId: "seb",
      name: "Design System Migration",
      cost: 1,
      kind: "tactic",
      amount: 0,
      scriptPowerOnEveryIncompleteFrontend: 1,
      triggerInstalledScripts: true,
      exhaust: true,
      display: { value: "+1", label: "Every Script", rules: "Frontend. Trigger. Exhaust." },
      rules:
        "Install Script 1 on every incomplete Frontend requirement, then trigger each. Exhaust.",
      tags: ["automation", "character", "exhaust", "rare", "reward"],
      rarity: "rare",
    },
  ],
} as const satisfies CharacterContent<"seb">;
