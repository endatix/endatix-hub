import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichText, RichTextImagePolicy } from "../rich-text";

describe("RichText", () => {
  it("renders sanitized inline markup as HTML", () => {
    const { container } = render(
      <RichTextImagePolicy allowedHosts={["example.com"]}>
        <RichText html='<strong>ACME</strong> <img src="https://example.com/a.png">' />
      </RichTextImagePolicy>,
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

  it("shows a remote image as a link to its host without a policy", () => {
    const { container } = render(
      <RichText html='<img src="https://example.com/a.png">' />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("a")?.textContent).toBe("example.com");
  });

  it("renders a span by default", () => {
    const { container } = render(<RichText html="ACME" />);

    expect(container.firstElementChild?.tagName).toBe("SPAN");
  });
});
