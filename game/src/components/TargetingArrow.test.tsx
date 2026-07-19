import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TargetingArrow } from "./TargetingArrow";

describe("TargetingArrow", () => {
  it("builds the arrowhead from one closed filled shape without an SVG marker", () => {
    const markup = renderToStaticMarkup(
      <TargetingArrow startX={120} startY={400} endX={300} endY={80} locked={false} />,
    );

    expect(markup).toContain('class="targeting-arrow__head"');
    expect(markup.match(/class="targeting-arrow__head" d="M [^"]+ Z"/)).not.toBeNull();
    expect(markup).not.toContain("targeting-arrow__head-base");
    expect(markup).not.toContain("<marker");
  });
});
