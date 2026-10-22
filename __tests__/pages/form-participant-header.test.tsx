import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/features/forms/form-workspace/ui/form-page-header-slot",
  () => ({
    FormPageHeaderSlot: ({
      formId,
      active,
    }: {
      formId: string;
      active: string;
    }) => <p>{`${formId}:${active}`}</p>,
  }),
);

describe("Form participant header", () => {
  it("keeps the Audience switcher current", async () => {
    const Header = (
      await import(
        "@/app/(main)/@header/forms/[formId]/audience/participants/[memberId]/page"
      )
    ).default;

    render(
      await Header({ params: Promise.resolve({ formId: "f1", memberId: "m1" }) }),
    );
    expect(screen.getByText("f1:audience")).toBeDefined();
  });
});
