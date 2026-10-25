import PersonalLinkPage, {
  metadata,
} from "@/app/(public)/share/[formId]/a/[token]/page";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { redeemLink } = vi.hoisted(() => ({ redeemLink: vi.fn() }));

vi.mock("@/lib/endatix-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/endatix-api")>()),
  EndatixApi: class {
    audience = { redeemLink };
  },
}));
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
  it("renders the opener for the link without redeeming it", async () => {
    const page = await PersonalLinkPage({
      params: Promise.resolve({ formId: "42", token: "link-token" }),
    });

    render(page);

    const opener = screen.getByTestId("open-personal-link");
    expect(opener.getAttribute("data-form-id")).toBe("42");
    expect(opener.getAttribute("data-token")).toBe("link-token");
    expect(redeemLink).not.toHaveBeenCalled();
  });

  it("sends no Referer, so the link's token never reaches another site", () => {
    expect(metadata.referrer).toBe("no-referrer");
  });
});
