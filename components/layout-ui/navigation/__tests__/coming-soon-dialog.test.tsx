import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComingSoonDialog } from "@/components/layout-ui/navigation/coming-soon-dialog";
import { BrandProvider } from "@/lib/branding/brand-provider";
import { packBrand } from "@/test/pack-brand";
import { renderWithBrand } from "@/test/render-with-brand";

const dialog = (
  <ComingSoonDialog isOpen onClose={() => {}} featureName="Workflows" />
);

describe("ComingSoonDialog", () => {
  it("keeps the Endatix copy and links with no brand pack", () => {
    renderWithBrand(dialog);

    expect(
      screen.getByText(/Endatix Hub is the new exciting way/),
    ).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "Learn about Endatix" })
        .getAttribute("href"),
    ).toBe("https://endatix.com?utm_source=endatix-hub&utm_medium=product");
    expect(
      screen.getByRole("link", { name: "Read our Docs" }).getAttribute("href"),
    ).toBe(
      "https://docs.endatix.com/docs/category/getting-started?utm_source=endatix-hub&utm_medium=product",
    );
  });

  it("names the pack and links only to the pack's own sites", () => {
    render(
      <BrandProvider
        brand={packBrand({ links: { website: "https://example.com" } })}
      >
        {dialog}
      </BrandProvider>,
    );

    expect(
      screen.getByText(/Example Forms is the new exciting way/),
    ).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "Learn about Example Forms" })
        .getAttribute("href"),
    ).toBe("https://example.com");
    expect(screen.queryByRole("link", { name: "Read our Docs" })).toBeNull();
  });
});
