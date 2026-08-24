import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BackToTableButton } from "../back-to-table-button";
import { rememberTableReturnTo } from "@/lib/list-page/table-return-to";

const identityParse = (query: string) => query;
const buildHref = (query: string) => `/things?${query}`;

describe("BackToTableButton", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("uses the fallback href when nothing is remembered", async () => {
    // Arrange & Act
    render(
      <BackToTableButton
        tableKey="things"
        fallbackHref="/things"
        parse={identityParse}
        buildHref={buildHref}
        text="Back to Things"
      />,
    );

    // Assert
    const link = await screen.findByRole("link", { name: /back to things/i });
    await waitFor(() => {
      expect(link.getAttribute("href")).toBe("/things");
    });
  });

  it("restores the remembered query, scoped by tableKey", async () => {
    // Arrange
    rememberTableReturnTo("things", "page=2&search=abc", identityParse);

    // Act
    render(
      <BackToTableButton
        tableKey="things"
        fallbackHref="/things"
        parse={identityParse}
        buildHref={buildHref}
      />,
    );

    // Assert
    const link = await screen.findByRole("link", { name: /back/i });
    await waitFor(() => {
      expect(link.getAttribute("href")).toBe("/things?page=2&search=abc");
    });
  });

  it("scopes remembered queries by scopeId", async () => {
    // Arrange
    rememberTableReturnTo("things", "page=9", identityParse, "parent-a");
    rememberTableReturnTo("things", "page=1", identityParse, "parent-b");

    // Act
    render(
      <BackToTableButton
        tableKey="things"
        scopeId="parent-a"
        fallbackHref="/things"
        parse={identityParse}
        buildHref={buildHref}
      />,
    );

    // Assert
    const link = await screen.findByRole("link", { name: /back/i });
    await waitFor(() => {
      expect(link.getAttribute("href")).toBe("/things?page=9");
    });
  });
});
