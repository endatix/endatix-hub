import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorPage } from "@/components/error-handling/error-page";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { UnauthorizedComponent } from "@/components/error-handling/unauthorized";

describe("ErrorPage", () => {
  it("renders code watermark, eyebrow, title, and sheep chrome", () => {
    // Arrange & Act
    render(
      <ErrorPage
        code="500"
        eyebrow="Unexpected error"
        title="Something went wrong."
        subtitle="An unexpected error interrupted this page."
        message="Try again."
      />,
    );

    // Assert
    expect(screen.getByText("500")).toBeDefined();
    expect(screen.getByText("Unexpected error")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Something went wrong.",
    );
    expect(document.querySelector(".sheep")).not.toBeNull();
  });

  /**
   * The watermark is decoration sized for a numeral. A phrase wraps across the copy
   * it sits behind, which is exactly the defect this guard exists to prevent.
   */
  it("drops the watermark when the code is a phrase, not a status", () => {
    // Arrange & Act
    render(<ErrorPage code="Form not found" title="We couldn't find that." />);

    // Assert
    expect(screen.queryByText("Form not found")).toBeNull();
  });

  it("omits the watermark entirely when no code is given", () => {
    // Arrange & Act
    const { container } = render(<ErrorPage title="We couldn't find that." />);

    // Assert
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it("renders one centred column with no sheep-beside-copy variant", () => {
    // Arrange & Act
    const { container } = render(<ErrorPage code="404" title="Not found." />);

    // Assert
    const section = container.querySelector("section");
    expect(section?.className).toContain("items-center");
    expect(section?.className).not.toContain("md:flex-row");
  });
});

describe("NotFoundComponent", () => {
  it("renders via shared ErrorPage chrome and defaults to a 404 watermark", () => {
    // Arrange & Act
    render(
      <NotFoundComponent
        notFoundTitle="Page not found"
        notFoundSubtitle="We couldn't find that page."
        notFoundMessage="Check the URL."
      />,
    );

    // Assert
    expect(screen.getByText("404")).toBeDefined();
    expect(screen.getByText("Page not found")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "We couldn't find that page.",
    );
    expect(document.querySelector(".sheep")).not.toBeNull();
  });

  /**
   * Routes that predate the code/eyebrow split pass "404" as the title. The watermark
   * already says that, so the eyebrow must not repeat it verbatim.
   */
  it('does not print the code twice when a legacy caller passes "404" as the title', () => {
    // Arrange & Act
    render(<NotFoundComponent notFoundTitle="404" />);

    // Assert
    expect(screen.getAllByText("404")).toHaveLength(1);
    expect(screen.getByText("Page not found")).toBeDefined();
  });
});

describe("UnauthorizedComponent", () => {
  it("shares the sheep chrome rather than its own icon treatment", () => {
    // Arrange & Act
    render(<UnauthorizedComponent />);

    // Assert
    expect(screen.getByText("403")).toBeDefined();
    expect(screen.getByText("Access denied")).toBeDefined();
    expect(document.querySelector(".sheep")).not.toBeNull();
  });
});
