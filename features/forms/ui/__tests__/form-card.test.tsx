import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Form } from "@/types";
import FormCard from "../form-card";

vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    ...rest
  }: ComponentProps<"a"> & {
    href: string | { pathname: string };
    prefetch?: boolean | null;
  }) => (
    <a
      href={typeof href === "string" ? href : href.pathname}
      data-prefetch={String(prefetch)}
      {...rest}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/features/folders/move-to-folder", () => ({
  useMoveToFolder: () => ({ openMoveDialog: vi.fn(), dialogProps: {} }),
  MoveToFolderDialog: () => null,
}));

vi.mock("@/features/forms/ui/delete-form-confirm", () => ({
  DeleteFormConfirm: () => null,
}));

const form = {
  id: "1001",
  name: "Customer feedback",
  isEnabled: true,
  isPublic: false,
  submissionsCount: 3,
} as Form;

describe("FormCard", () => {
  it("does not prefetch the Submissions route, whose metadata checks Hub access", () => {
    // Arrange & Act
    render(
      <FormCard form={form} isSelected={false} onSaveAsTemplate={vi.fn()} />,
    );

    // Assert
    const link = screen.getByRole("link", { name: "Submissions" });
    expect(link.getAttribute("href")).toBe("/forms/1001/submissions");
    expect(link.getAttribute("data-prefetch")).toBe("false");
  });
});
