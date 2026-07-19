import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TargetingArrow } from "./TargetingArrow";

describe("TargetingArrow", () => {
  it("builds one outlined silhouette with a shaft-width opening at the arrowhead base", () => {
    const markup = renderToStaticMarkup(
      <TargetingArrow startX={120} startY={400} endX={300} endY={80} locked={false} />,
    );

    expect(markup).toContain('class="targeting-arrow__head-fill"');
    expect(markup).toContain('class="targeting-arrow__head-edge"');
    expect(markup).toContain('class="targeting-arrow__head-base"');
    expect(markup.match(/class="targeting-arrow__head-base" d="M [^"]+ M /)).not.toBeNull();
    expect(markup).not.toContain("<marker");
  });
});
