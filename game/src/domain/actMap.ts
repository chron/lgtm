import type { MapEdge, MapNode } from "./models";

export interface ActMap {
  nodes: readonly MapNode[];
  edges: readonly MapEdge[];
}

const nodeTemplates = [
  {
    id: "cycle-1",
    kind: "cycle",
    title: "Cycle",
    encounterSlot: "opener",
    position: { x: 50, y: 4 },
  },
  {
    id: "event-1",
    kind: "event",
    title: "Scope Creep",
    position: { x: 26, y: 12 },
  },
  {
    id: "cycle-optional-1",
    kind: "cycle",
    title: "Cycle",
    encounterSlot: "early",
    position: { x: 74, y: 12 },
  },
  {
    id: "cycle-2",
    kind: "cycle",
    title: "Cycle",
    encounterSlot: "tall",
    position: { x: 50, y: 20 },
  },
  {
    id: "incident-1",
    kind: "incident",
    title: "Production Incident",
    cycleId: "production-incident",
    position: { x: 26, y: 28 },
  },
  {
    id: "cycle-safe-1",
    kind: "cycle",
    title: "Cycle",
    encounterSlot: "safe-incident-1",
    position: { x: 74, y: 28 },
  },
  {
    id: "shop-1",
    kind: "shop",
    title: "Tool Budget",
    position: { x: 26, y: 36 },
  },
  {
    id: "event-2",
    kind: "event",
    title: "One Tiny Thing",
    position: { x: 74, y: 36 },
  },
  {
    id: "weekend-1",
    kind: "weekend",
    title: "Weekend",
    position: { x: 50, y: 41 },
  },
  {
    id: "cycle-3",
    kind: "cycle",
    title: "Cycle",
    encounterSlot: "wide",
    position: { x: 50, y: 47 },
  },
  {
    id: "event-3",
    kind: "event",
    title: "Can We Sneak This In?",
    position: { x: 26, y: 56 },
  },
  {
    id: "cycle-optional-2",
    kind: "cycle",
    title: "Cycle",
    encounterSlot: "mid",
    position: { x: 74, y: 56 },
  },
  {
    id: "cycle-4",
    kind: "cycle",
    title: "Cycle",
    encounterSlot: "late",
    position: { x: 50, y: 65 },
  },
  {
    id: "incident-2",
    kind: "incident",
    title: "Everything Is Fine",
    cycleId: "cascade-incident",
    position: { x: 26, y: 73 },
  },
  {
    id: "cycle-safe-2",
    kind: "cycle",
    title: "Cycle",
    encounterSlot: "safe-incident-2",
    position: { x: 74, y: 73 },
  },
  {
    id: "shop-2",
    kind: "shop",
    title: "Emergency Budget",
    position: { x: 26, y: 81 },
  },
  {
    id: "event-4",
    kind: "event",
    title: "Ship It Friday",
    position: { x: 74, y: 81 },
  },
  {
    id: "weekend-2",
    kind: "weekend",
    title: "Weekend",
    position: { x: 50, y: 86 },
  },
  {
    id: "final-release",
    kind: "boss",
    title: "Final Release",
    cycleId: "final-release",
    position: { x: 50, y: 92 },
  },
  {
    id: "retro-1",
    kind: "retro",
    title: "Release",
    position: { x: 50, y: 98 },
  },
] as const satisfies readonly MapNode[];

const branchPairs = [
  ["event-1", "cycle-optional-1"],
  ["incident-1", "cycle-safe-1"],
  ["shop-1", "event-2"],
  ["event-3", "cycle-optional-2"],
  ["incident-2", "cycle-safe-2"],
  ["shop-2", "event-4"],
] as const;

function seededIndex(seed: number, salt: number, length: number): number {
  let value = (seed ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) % length;
}

function branchEdges(
  sources: readonly [string, string],
  targets: readonly [string, string],
  variant: number,
  positionsById: ReadonlyMap<string, number>,
): MapEdge[] {
  const [sourceLeft, sourceRight] = [...sources].sort(
    (first, second) => positionsById.get(first)! - positionsById.get(second)!,
  );
  const [targetLeft, targetRight] = [...targets].sort(
    (first, second) => positionsById.get(first)! - positionsById.get(second)!,
  );
  const patterns = [
    [
      [sourceLeft, targetLeft],
      [sourceRight, targetRight],
    ],
    [
      [sourceLeft, targetLeft],
      [sourceLeft, targetRight],
      [sourceRight, targetLeft],
      [sourceRight, targetRight],
    ],
  ] as const;
  return patterns[variant % patterns.length]!.map(([fromNodeId, toNodeId]) => ({
    fromNodeId,
    toNodeId,
  }));
}

export function getActMap(seed: number): ActMap {
  const pairPositions = new Map<string, number>();
  for (const [index, [firstId, secondId]] of branchPairs.entries()) {
    const swap = seededIndex(seed, 0x1100 + index * 0x101, 2) === 1;
    const leftX = 23 + seededIndex(seed, 0x2200 + index * 0x101, 7);
    const rightX = 77 - seededIndex(seed, 0x3300 + index * 0x101, 7);
    pairPositions.set(firstId, swap ? rightX : leftX);
    pairPositions.set(secondId, swap ? leftX : rightX);
  }

  const nodes = nodeTemplates.map((node, index) => ({
    ...node,
    position: {
      x:
        pairPositions.get(node.id) ??
        Math.max(46, Math.min(54, 50 + seededIndex(seed, 0x4400 + index * 0x41, 7) - 3)),
      y: node.position.y,
    },
  }));
  const positionsById = new Map(nodes.map((node) => [node.id, node.position.x]));

  const fixedEdges: MapEdge[] = [
    { fromNodeId: "cycle-1", toNodeId: "event-1" },
    { fromNodeId: "cycle-1", toNodeId: "cycle-optional-1" },
    { fromNodeId: "event-1", toNodeId: "cycle-2" },
    { fromNodeId: "cycle-optional-1", toNodeId: "cycle-2" },
    { fromNodeId: "cycle-2", toNodeId: "incident-1" },
    { fromNodeId: "cycle-2", toNodeId: "cycle-safe-1" },
    { fromNodeId: "shop-1", toNodeId: "weekend-1" },
    { fromNodeId: "event-2", toNodeId: "weekend-1" },
    { fromNodeId: "weekend-1", toNodeId: "cycle-3" },
    { fromNodeId: "cycle-3", toNodeId: "event-3" },
    { fromNodeId: "cycle-3", toNodeId: "cycle-optional-2" },
    { fromNodeId: "event-3", toNodeId: "cycle-4" },
    { fromNodeId: "cycle-optional-2", toNodeId: "cycle-4" },
    { fromNodeId: "cycle-4", toNodeId: "incident-2" },
    { fromNodeId: "cycle-4", toNodeId: "cycle-safe-2" },
    { fromNodeId: "shop-2", toNodeId: "weekend-2" },
    { fromNodeId: "event-4", toNodeId: "weekend-2" },
    { fromNodeId: "weekend-2", toNodeId: "final-release" },
    { fromNodeId: "final-release", toNodeId: "retro-1" },
  ];
  const edges = [
    ...fixedEdges,
    ...branchEdges(
      ["incident-1", "cycle-safe-1"],
      ["shop-1", "event-2"],
      seededIndex(seed, 0x51a7, 2),
      positionsById,
    ),
    ...branchEdges(
      ["incident-2", "cycle-safe-2"],
      ["shop-2", "event-4"],
      seededIndex(seed, 0x92c3, 2),
      positionsById,
    ),
  ];

  return { nodes, edges };
}
