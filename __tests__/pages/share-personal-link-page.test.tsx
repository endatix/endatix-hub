import PersonalLinkPage, {
  metadata,
} from "@/app/(public)/share/[formId]/a/[token]/page";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/features/public-form/open-personal-link/ui/open-personal-link",
  () => ({
    OpenPersonalLink: ({
      formId,
      token,
    }: {
      formId: string;
      token: string;
    }) => (
      <div
        data-form-id={formId}
        data-testid="open-personal-link"
        data-token={token}
      />
    ),
  }),
);

describe("Personalized link page", () => {
  it("renders the opener for the link", async () => {
    const page = await PersonalLinkPage({
      params: Promise.resolve({ formId: "42", token: "link-token" }),
    });

    render(page);

    const opener = screen.getByTestId("open-personal-link");
    expect(opener.getAttribute("data-form-id")).toBe("42");
    expect(opener.getAttribute("data-token")).toBe("link-token");
  });

  it("sends no Referer, so the link's token never reaches another site", () => {
    expect(metadata.referrer).toBe("no-referrer");
  });
});
