import { describe, expect, it } from "vitest";
import { getTool, standardToolIds, tools } from "./content";
import { eventDefinitions, getEvent } from "./events";
import type { RunState } from "./models";
import {
  advanceEventResolution,
  continueEventResolution,
  resolveEventChoice,
} from "../game/eventResolution";
import { gameReducer, initialGameState } from "../game/gameReducer";

function playableRun(seed = 0xe7e17): RunState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed });
  for (const developerId of ["paul", "odin", "madi"] as const) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");
  return state.run;
}

function choice(eventId: string, choiceId: string) {
  const found = getEvent(eventId).choices.find((candidate) => candidate.id === choiceId);
  if (!found) throw new Error(`Missing ${eventId}/${choiceId}`);
  return found;
}

describe("first Event batch", () => {
  it.each([
    ["quarterly-connect", ["demo", "cross-pollinate", "retro"]],
    ["level-up-day", ["learn", "refactor", "tinker"]],
    ["quiet-hours", ["deep-work", "clean-up", "plan-async"]],
    ["karaoke-night", ["solo", "duet", "power-ballad"]],
    ["coffee-summit", ["nz-cup", "melbourne-flat-white", "order-for-everyone"]],
    ["cat-tax", ["wave-hello", "keyboard-review", "make-them-mascot"]],
    ["mascot-council", ["choose-a-mascot"]],
    ["founder-hackathon", ["let-mateja-cook", "ask-tristan-for-numbers", "nick-makes-a-board"]],
    ["customer-feedback-flood", ["synthesize", "fix-the-top-pain", "share-the-praise"]],
    ["enterprise-request", ["commit", "negotiate", "prototype"]],
    ["design-opened-a-pr", ["pair-up", "review-together", "merge-it"]],
    ["daylight-saving-incident", ["go-async", "move-standup", "automate-calendar"]],
  ])("authors %s with its locked choices and explicit previews", (eventId, choiceIds) => {
    const run = playableRun();
    const event = getEvent(eventId);
    expect(event.choices.map((candidate) => candidate.id)).toEqual(choiceIds);
    for (const candidate of event.choices) {
      expect(resolveEventChoice(candidate, run).outcome.length).toBeGreaterThan(0);
      expect(resolveEventChoice(candidate, run).outcome.every((outcome) => outcome.text)).toBe(
        true,
      );
    }
  });

  it("authors exactly the twelve launch Events", () => {
    expect(eventDefinitions).toHaveLength(12);
    expect(new Set(eventDefinitions.map((event) => event.id)).size).toBe(12);
  });

  it("weights Cat Tax toward cat squads without excluding anyone", () => {
    const catTax = getEvent("cat-tax");
    const run = playableRun();
    expect(catTax.eligibility(run)).toBe(true);
    expect(catTax.weight(run)).toBe(3);
    expect(catTax.weight({ ...run, squad: ["irene", "madi"] })).toBe(1);
  });

  it("keeps unavailable surgery and exclusive Tool choices visible with direct reasons", () => {
    const run = { ...playableRun(), deck: [] };
    expect(resolveEventChoice(choice("level-up-day", "refactor"), run).disabledReason).toBe(
      "No eligible cards",
    );
    expect(
      resolveEventChoice(choice("daylight-saving-incident", "automate-calendar"), {
        ...run,
        tools: ["timezone-wrangler"],
      }).disabledReason,
    ).toBe("No Tools available");
  });

  it("resolves Coffee Summit's composed stabilising outcome exactly", () => {
    const run = { ...playableRun(), credits: 20, morale: 6 };
    const progress = advanceEventResolution(
      run,
      choice("coffee-summit", "order-for-everyone").effects,
    );
    expect(progress.pending).toBeUndefined();
    expect(progress.run).toMatchObject({ credits: 10, morale: 9 });
    expect(progress.run.nextCycleModifiers).toEqual([
      { kind: "opening-focus", amount: 1 },
      { kind: "opening-draw", amount: 1 },
    ]);
    expect(progress.outcome).toEqual([
      "−10 Credits",
      "+3 Morale",
      "+1 opening Focus",
      "+1 opening draw",
    ]);
  });

  it("builds deterministic themed, guest, and exclusive mascot selections", () => {
    const run = playableRun(4242);
    const demoEffects = choice("quarterly-connect", "demo").effects;
    const demo = advanceEventResolution(run, demoEffects);
    const demoAgain = advanceEventResolution(run, demoEffects);
    expect(demo.pending?.kind).toBe("draft");
    expect(demo.pending?.options).toHaveLength(3);
    expect(demo.pending?.options.map((option) => option.id)).toEqual(
      demoAgain.pending?.options.map((option) => option.id),
    );

    const guest = advanceEventResolution(
      run,
      choice("quarterly-connect", "cross-pollinate").effects,
    );
    expect(guest.pending?.kind).toBe("guest");
    expect(guest.pending?.options.every((option) => option.cardId)).toBe(true);

    const mascotEffects = choice("mascot-council", "choose-a-mascot").effects;
    const mascot = advanceEventResolution(run, mascotEffects);
    expect(mascot.pending?.options.map((option) => option.toolId).sort()).toEqual([
      "pangolin",
      "platypus",
      "reef-shark",
    ]);
    const selected = mascot.pending?.options[0];
    if (!selected) throw new Error("Expected a mascot Tool");
    const installed = continueEventResolution(mascot.run, mascotEffects, mascot, selected.id);
    expect(installed?.run.tools).toContain(selected.toolId);
  });

  it("authors Founder, customer, and enterprise build-shaping outcomes", () => {
    const run = playableRun(8181);
    const mateja = advanceEventResolution(
      run,
      choice("founder-hackathon", "let-mateja-cook").effects,
    );
    expect(mateja.pending?.options.every((option) => option.cardId === "parallel-agents")).toBe(
      true,
    );

    const nick = advanceEventResolution(
      { ...run, currentNodeId: "event-1" },
      choice("founder-hackathon", "nick-makes-a-board").effects,
    );
    expect(nick.run.nextRewardModifiers).toContainEqual({ choiceCount: 4 });
    expect(nick.run.mapModifiers.some((modifier) => modifier.kind === "reveal")).toBe(true);

    const customer = advanceEventResolution(
      run,
      choice("customer-feedback-flood", "fix-the-top-pain").effects,
    );
    expect(customer.run.pendingBounties).toContainEqual(
      expect.objectContaining({ id: "customer-top-pain", reward: { kind: "tool-offer" } }),
    );

    const enterprise = advanceEventResolution(run, choice("enterprise-request", "commit").effects);
    expect(enterprise.run.pendingBounties).toContainEqual(
      expect.objectContaining({
        id: "enterprise-commitment",
        reward: { kind: "credits-and-rare-card-offer", amount: 30 },
      }),
    );
  });

  it("pays both halves of the Enterprise bounty when it ships", () => {
    const prepared = advanceEventResolution(
      playableRun(),
      choice("enterprise-request", "commit").effects,
    ).run;
    let state = gameReducer(
      { screen: { name: "map" }, run: prepared },
      { type: "VISIT_NODE", nodeId: "cycle-1" },
    );
    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    const bounty = state.run.cycle.tasks.find((task) => task.taskId === "enterprise-commitment");
    if (!bounty) throw new Error("Expected the Enterprise bounty");
    state = {
      ...state,
      run: {
        ...state.run,
        cycle: {
          ...state.run.cycle,
          tasks: state.run.cycle.tasks.map((task) =>
            task.taskId === bounty.taskId
              ? {
                  ...task,
                  status: "ready" as const,
                  requirements: task.requirements.map((requirement) => ({
                    ...requirement,
                    verified: requirement.target,
                  })),
                }
              : task,
          ),
        },
      },
    };

    state = gameReducer(state, { type: "SHIP_TASK", taskId: bounty.taskId });
    expect(state.run?.credits).toBe(prepared.credits + 30);
    expect(state.run?.nextRewardModifiers).toContainEqual({ guaranteedRarity: "rare" });
  });

  it("registers the five uncapped event-exclusive Tools", () => {
    const exclusiveIds = [
      "cat-tax",
      "reef-shark",
      "platypus",
      "pangolin",
      "timezone-wrangler",
    ] as const;
    const exclusiveIdSet = new Set<string>(exclusiveIds);
    expect(tools.filter((tool) => exclusiveIdSet.has(tool.id)).map((tool) => tool.id)).toEqual(
      exclusiveIds,
    );
    expect(standardToolIds.some((toolId) => exclusiveIdSet.has(toolId))).toBe(false);
    for (const toolId of exclusiveIds) {
      expect(getTool(toolId).rules).not.toMatch(/first|once|per Day/i);
    }
  });
});
