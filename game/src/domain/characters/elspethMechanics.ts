export function healthyPaceBlock(tags: readonly string[], psychologicalSafetyStacks = 0): number {
  return tags.includes("flexible") ? 2 + psychologicalSafetyStacks * 2 : 0;
}

export function airCoverBlock(openTaskCount: number): number {
  return Math.max(0, openTaskCount) * 3;
}

export function roomToBreatheDraw(block: number, incomingMorale: number): number {
  return block >= incomingMorale ? 2 : 0;
}

export function blockAfterHealthyPace(
  currentBlock: number,
  tags: readonly string[],
  psychologicalSafetyStacks = 0,
): number {
  return currentBlock + healthyPaceBlock(tags, psychologicalSafetyStacks);
}
