import { describe, expect, it } from "vitest";
import { formatLgtmExpansion, getLgtmExpansion, lgtmExpansions } from "./brand";

describe("LGTM expansions", () => {
  it("keeps every joke faithful to the acronym", () => {
    for (const expansion of lgtmExpansions) {
      expect(expansion).toHaveLength(4);
      expect(expansion.map((word) => word[0]).join(""), formatLgtmExpansion(expansion)).toBe(
        "LGTM",
      );
    }
  });

  it("wraps indices so the title can rotate forever", () => {
    expect(getLgtmExpansion(lgtmExpansions.length)).toBe(lgtmExpansions[0]);
    expect(getLgtmExpansion(-1)).toBe(lgtmExpansions.at(-1));
  });
});
