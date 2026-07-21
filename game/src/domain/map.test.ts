import { describe, expect, it } from "vitest";
import { getActMap, getCycle, getMapNodeCycleId, isMapNodeAvailable } from "./content";
import type { MapEdge, MapNode } from "./models";

function outgoingEdges(edges: readonly MapEdge[]): Map<string, string[]> {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    outgoing.set(edge.fromNodeId, [...(outgoing.get(edge.fromNodeId) ?? []), edge.toNodeId]);
  }
  return outgoing;
}

function routesToFinal(nodes: readonly MapNode[], edges: readonly MapEdge[]): string[][] {
  const routes: string[][] = [];
  const outgoing = outgoingEdges(edges);
  const visit = (nodeId: string, route: string[]) => {
    const nextRoute = [...route, nodeId];
    if (nodeId === "final-release") {
      routes.push(nextRoute);
      return;
    }
    for (const childId of outgoing.get(nodeId) ?? []) visit(childId, nextRoute);
  };
  expect(nodes.some((node) => node.id === "cycle-1")).toBe(true);
  visit("cycle-1", []);
  return routes;
}

describe("seeded act map", () => {
  it("repeats exactly for a seed while producing different routes and layouts", () => {
    expect(getActMap(42)).toEqual(getActMap(42));

    const signatures = new Set(
      Array.from({ length: 40 }, (_, seed) => {
        const map = getActMap(seed + 1);
        return JSON.stringify({
          positions: map.nodes.map((node) => node.position.x),
          edges: map.edges,
        });
      }),
    );

    expect(signatures.size).toBeGreaterThan(30);
  });

  it("keeps every generated map valid, connected, and forward-only", () => {
    for (let seed = 1; seed <= 250; seed += 1) {
      const { nodes, edges } = getActMap(seed);
      const nodesById = new Map(nodes.map((node) => [node.id, node]));
      const outgoing = outgoingEdges(edges);
      const incoming = new Map<string, string[]>();

      expect(nodesById.size).toBe(nodes.length);
      for (const node of nodes) {
        expect(node.position.x).toBeGreaterThan(0);
        expect(node.position.x).toBeLessThan(100);
        expect(node.position.y).toBeGreaterThan(0);
        expect(node.position.y).toBeLessThan(100);
      }

      for (const edge of edges) {
        const from = nodesById.get(edge.fromNodeId);
        const to = nodesById.get(edge.toNodeId);
        expect(from, `${edge.fromNodeId} should exist for seed ${seed}`).toBeDefined();
        expect(to, `${edge.toNodeId} should exist for seed ${seed}`).toBeDefined();
        expect(to!.position.y).toBeGreaterThan(from!.position.y);
        incoming.set(edge.toNodeId, [...(incoming.get(edge.toNodeId) ?? []), edge.fromNodeId]);
      }

      expect(incoming.get("cycle-1")).toBeUndefined();
      for (const node of nodes) {
        if (node.id !== "cycle-1") expect(incoming.get(node.id)?.length).toBeGreaterThan(0);
        if (node.id !== "retro-1") expect(outgoing.get(node.id)?.length).toBeGreaterThan(0);
      }

      const reachable = new Set<string>();
      const queue = ["cycle-1"];
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (reachable.has(nodeId)) continue;
        reachable.add(nodeId);
        queue.push(...(outgoing.get(nodeId) ?? []));
      }
      expect(reachable.size).toBe(nodes.length);
      expect(reachable.has("final-release")).toBe(true);
      expect(outgoing.get("final-release")).toEqual(["retro-1"]);
    }
  });

  it("keeps branch lanes balanced and avoids backwards single-choice crossings", () => {
    const branchLayers = [
      {
        sources: ["incident-1", "cycle-safe-1"],
        targets: ["shop-1", "event-2"],
      },
      {
        sources: ["incident-2", "cycle-safe-2"],
        targets: ["shop-2", "event-4"],
      },
    ] as const;

    for (let seed = 1; seed <= 250; seed += 1) {
      const { nodes, edges } = getActMap(seed);
      const nodesById = new Map(nodes.map((node) => [node.id, node]));
      const outgoing = outgoingEdges(edges);

      for (const layer of branchLayers) {
        const childCounts = layer.sources.map((sourceId) => outgoing.get(sourceId)?.length ?? 0);
        expect(new Set(childCounts).size, `balanced choices for seed ${seed}`).toBe(1);
        expect([1, 2]).toContain(childCounts[0]);

        if (childCounts[0] === 1) {
          const orderedSources = [...layer.sources].sort(
            (first, second) => nodesById.get(first)!.position.x - nodesById.get(second)!.position.x,
          );
          const orderedTargets = [...layer.targets].sort(
            (first, second) => nodesById.get(first)!.position.x - nodesById.get(second)!.position.x,
          );
          expect(outgoing.get(orderedSources[0]!)![0]).toBe(orderedTargets[0]);
          expect(outgoing.get(orderedSources[1]!)![0]).toBe(orderedTargets[1]);
        }
      }
    }
  });

  it("offers only roots initially and the generated direct children after a choice", () => {
    for (const seed of [1, 42, 0x5eed1234]) {
      const { nodes, edges } = getActMap(seed);
      const availableFrom = (currentNodeId: string | null, completedNodeIds: readonly string[]) =>
        nodes
          .filter((node) => isMapNodeAvailable(node, currentNodeId, completedNodeIds, edges))
          .map((node) => node.id);

      expect(availableFrom(null, [])).toEqual(["cycle-1"]);
      expect(availableFrom("cycle-1", ["cycle-1"])).toEqual(["event-1", "cycle-optional-1"]);
      expect(availableFrom("event-1", ["cycle-1", "event-1"])).toEqual(["cycle-2"]);
      expect(availableFrom("cycle-2", ["cycle-1", "event-1", "cycle-2"])).toEqual([
        "incident-1",
        "cycle-safe-1",
      ]);
    }
  });

  it("keeps every route within the condensed seven-to-nine-fight contract", () => {
    for (let seed = 1; seed <= 250; seed += 1) {
      const { nodes, edges } = getActMap(seed);
      const nodesById = new Map(nodes.map((node) => [node.id, node]));
      const routes = routesToFinal(nodes, edges);

      expect(routes.length).toBeGreaterThan(0);
      const fightCounts = routes.map(
        (route) =>
          route.filter((nodeId) => {
            const kind = nodesById.get(nodeId)?.kind;
            return kind === "cycle" || kind === "incident" || kind === "boss";
          }).length,
      );
      expect(Math.min(...fightCounts)).toBe(7);
      expect(Math.max(...fightCounts)).toBe(9);

      for (const route of routes) {
        expect(route).toContain("weekend-1");
        expect(route).toContain("weekend-2");
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
    }
  });

  it("resolves seeded encounter slots without exposing duplicate Cycles", () => {
    for (const seed of [1, 42, 0x5eed1234]) {
      const nodes = getActMap(seed).nodes;
      const cycleIds = nodes
        .filter((node) => node.kind === "cycle")
        .map((node) => getMapNodeCycleId(node, seed));
      const repeated = getActMap(seed)
        .nodes.filter((node) => node.kind === "cycle")
        .map((node) => getMapNodeCycleId(node, seed));

      expect(cycleIds.every((cycleId) => cycleId && getCycle(cycleId))).toBe(true);
      expect([...new Set(cycleIds)]).toHaveLength(cycleIds.length);
      expect(repeated).toEqual(cycleIds);
    }
  });
});
