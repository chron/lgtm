import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TitleScreen } from "./TitleScreen";

describe("TitleScreen", () => {
  it("keeps the squad art as a control-free ambient slideshow", () => {
    const markup = renderToStaticMarkup(
      <TitleScreen
        dispatch={() => undefined}
        onOpenAchievements={() => undefined}
        onOpenCodex={() => undefined}
      />,
    );

    expect(markup).toContain('<figcaption class="sr-only">LGTM team artwork</figcaption>');
    expect(markup.match(/class="title-screen__art /g)).toHaveLength(7);
    expect(markup).not.toContain("title-art-picker");
    expect(markup).not.toContain("aria-pressed");
    expect(markup).not.toContain("Tutorial Run");
    expect(markup).toContain("Codex");
  });
});
