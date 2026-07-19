export const lgtmExpansions = [
  ["Looks", "Good", "To", "Me"],
  ["Lyssna", "Gets", "There,", "Mostly"],
  ["Let’s", "Get", "This", "Merged"],
  ["Looks", "Good,", "Technically", "Maybe"],
  ["Lyssna", "Generates", "Technical", "Mayhem"],
  ["Let’s", "Generate", "Tomorrow’s", "Maintenance"],
  ["Large", "Goals,", "Tiny", "Morale"],
  ["Lyssna’s", "Got", "This,", "Mostly"],
] as const;

export type LgtmExpansion = (typeof lgtmExpansions)[number];

export function getLgtmExpansion(index: number): LgtmExpansion {
  const normalizedIndex =
    ((Math.trunc(index) % lgtmExpansions.length) + lgtmExpansions.length) % lgtmExpansions.length;
  return lgtmExpansions[normalizedIndex];
}

export function formatLgtmExpansion(expansion: LgtmExpansion): string {
  return expansion.join(" ");
}
