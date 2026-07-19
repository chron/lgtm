import { describe, expect, it } from "vitest";
import { getCycle, getMapNodeCycleId, isMapNodeAvailable, mapEdges, mapNodes } from "./content";

describe("authored act map", () => {
  it("has valid forward edges and explicit node coordinates", () => {
    const nodesById = new Map(mapNodes.map((node) => [node.id, node]));

    for (const node of mapNodes) {
      expect(node.position.x).toBeGreaterThan(0);
      expect(node.position.x).toBeLessThan(100);
      expect(node.position.y).toBeGreaterThan(0);
      expect(node.position.y).toBeLessThan(100);
    }

    for (const edge of mapEdges) {
      const from = nodesById.get(edge.fromNodeId);
      const to = nodesById.get(edge.toNodeId);
      expect(from, `${edge.fromNodeId} should exist`).toBeDefined();
      expect(to, `${edge.toNodeId} should exist`).toBeDefined();
      expect(to?.position.y).toBeGreaterThan(from?.position.y ?? Number.POSITIVE_INFINITY);
    }
  });

  it("offers only roots initially and only direct children after a choice", () => {
    const availableFrom = (currentNodeId: string | null, completedNodeIds: readonly string[]) =>
      mapNodes
        .filter((node) => isMapNodeAvailable(node, currentNodeId, completedNodeIds))
        .map((node) => node.id);

    expect(availableFrom(null, [])).toEqual(["cycle-1"]);
    expect(availableFrom("cycle-1", ["cycle-1"])).toEqual(["event-1", "cycle-optional-1"]);
    expect(availableFrom("event-1", ["cycle-1", "event-1"])).toEqual(["cycle-2"]);
    expect(availableFrom("cycle-2", ["cycle-1", "event-1", "cycle-2"])).toEqual([
      "incident-1",
      "cycle-safe-1",
    ]);
  });

  it("builds every route from seven fights plus up to two optional fights", () => {
    const nodesById = new Map(mapNodes.map((node) => [node.id, node]));
    const outgoing = new Map<string, string[]>();
    for (const edge of mapEdges) {
      outgoing.set(edge.fromNodeId, [...(outgoing.get(edge.fromNodeId) ?? []), edge.toNodeId]);
    }

    const routes: string[][] = [];
    const visit = (nodeId: string, route: string[]) => {
      const nextRoute = [...route, nodeId];
      if (nodeId === "final-release") {
        routes.push(nextRoute);
        return;
      }
      for (const childId of outgoing.get(nodeId) ?? []) visit(childId, nextRoute);
    };
    visit("cycle-1", []);

    expect(routes).toHaveLength(64);
    const fightCounts = routes.map(
      (route) =>
        route.filter((nodeId) => {
          const kind = nodesById.get(nodeId)?.kind;
          return kind === "cycle" || kind === "incident" || kind === "boss";
        }).length,
    );
    expect(Math.min(...fightCounts)).toBe(7);
    expect(Math.max(...fightCounts)).toBe(9);
    expect(new Set(fightCounts)).toEqual(new Set([7, 8, 9]));

    for (const route of routes) {
      const incidentCount = route.filter(
        (nodeId) => nodesById.get(nodeId)?.kind === "incident",
      ).length;
      expect(incidentCount).toBeGreaterThanOrEqual(0);
      expect(incidentCount).toBeLessThanOrEqual(2);
      expect(
        route.filter((nodeId) => ["incident-1", "cycle-safe-1"].includes(nodeId)),
      ).toHaveLength(1);
      expect(
        route.filter((nodeId) => ["incident-2", "cycle-safe-2"].includes(nodeId)),
      ).toHaveLength(1);
      expect(route.filter((nodeId) => nodesById.get(nodeId)?.kind === "boss")).toEqual([
        "final-release",
      ]);
    }
  });

  it("resolves seeded encounter slots without exposing duplicate Cycles", () => {
    for (const seed of [1, 42, 0x5eed1234]) {
      const cycleIds = mapNodes
        .filter((node) => node.kind === "cycle")
        .map((node) => getMapNodeCycleId(node, seed));
      const repeated = mapNodes
        .filter((node) => node.kind === "cycle")
        .map((node) => getMapNodeCycleId(node, seed));

      expect(cycleIds.every((cycleId) => cycleId && getCycle(cycleId))).toBe(true);
      expect([...new Set(cycleIds)]).toHaveLength(cycleIds.length);
      expect(repeated).toEqual(cycleIds);
    }
  });
});
