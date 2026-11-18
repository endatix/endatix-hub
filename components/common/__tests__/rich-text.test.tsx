import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichText } from "../rich-text";

describe("RichText", () => {
  it("renders sanitized inline markup as HTML", () => {
    const { container } = render(
      <RichText html='<strong>ACME</strong> <img src="https://example.com/a.png">' />,
    );

    expect(container.querySelector("strong")?.textContent).toBe("ACME");
    expect(container.querySelector("img[loading=lazy]")).not.toBeNull();
  });

  it("removes event handlers and scripts", () => {
    const { container } = render(
      <RichText html='<img src="https://example.com/a.png" onerror="alert(1)"><script>alert(2)</script>' />,
    );

    expect(container.innerHTML).not.toMatch(/onerror|<script/);
  });

  it("renders a span by default", () => {
    const { container } = render(<RichText html="ACME" />);

    expect(container.firstElementChild?.tagName).toBe("SPAN");
  });
});
