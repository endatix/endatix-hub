import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormTemplate } from "@/types";
import { useMediaQuery } from "@/lib/utils/hooks/use-media-query.hook";
import FormTemplateCard from "../form-template-card";
import FormTemplateSheet from "../form-template-sheet";
import { FormTemplatePreview } from "../form-template-preview";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/features/folders/move-to-folder", () => ({
  useMoveToFolder: () => ({ openMoveDialog: vi.fn(), dialogProps: {} }),
  MoveToFolderDialog: () => null,
}));

vi.mock("../../application/run-create-form-from-template.client", () => ({
  runCreateFormFromTemplate: vi.fn(),
}));

vi.mock("../../application/delete-template.action", () => ({
  deleteTemplateAction: vi.fn(),
}));

// The preview loads the template on open; it never resolves here, so the footer renders while loading.
vi.mock("../../application/get-template.action", () => ({
  getTemplateAction: vi.fn(() => new Promise(() => {})),
}));

vi.mock(
  "@/features/forms/application/actions/get-custom-questions.action",
  () => ({ getCustomQuestionsAction: vi.fn(() => new Promise(() => {})) }),
);

vi.mock("@/customizations/questions/question-registry", () => ({
  customQuestions: [],
}));

vi.mock("@/lib/questions/question-loader-module", () => ({
  questionLoaderModule: { loadQuestion: vi.fn() },
}));

vi.mock("@/lib/questions/features/group-randomization", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/questions/audio-recorder", () => ({
  registerAudioQuestion: vi.fn(),
}));

vi.mock("@/lib/questions/infrastructure/specialized-survey-question", () => ({
  initializeCustomQuestions: vi.fn(),
}));

vi.mock("@/lib/designer-runtime", () => ({
  DesignerRuntimeProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: vi.fn(),
}));

const template = {
  id: "7",
  name: "Onboarding",
  description: "New hire checklist",
  createdAt: new Date("2026-01-01T00:00:00Z"),
} as FormTemplate;

function queryUseTemplateButton() {
  return screen.queryByRole("button", { name: /use template/i });
}

describe.each([true, false])(
  "Use Template with canCreateForms=%s",
  (canCreateForms) => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("shows the card's Use Template only with forms.create", () => {
      // Act
      render(
        <FormTemplateCard
          template={template}
          isSelected={false}
          canCreateForms={canCreateForms}
        />,
      );

      // Assert
      expect(screen.getByRole("button", { name: /preview/i })).toBeDefined();
      expect(queryUseTemplateButton() !== null).toBe(canCreateForms);
    });

    it("shows the sheet's Use Template only with forms.create", async () => {
      // Act
      render(
        <FormTemplateSheet
          selectedTemplate={template}
          open
          canCreateForms={canCreateForms}
        />,
      );

      // Assert
      expect(
        await screen.findByRole("button", { name: /preview/i }),
      ).toBeDefined();
      expect(queryUseTemplateButton() !== null).toBe(canCreateForms);
    });

    it.each([
      ["desktop dialog", true],
      ["mobile drawer", false],
    ])(
      "shows the preview %s's Use Template only with forms.create",
      async (_, isDesktop) => {
        // Arrange
        vi.mocked(useMediaQuery).mockReturnValue(isDesktop);

        // Act
        render(
          <FormTemplatePreview
            open
            onOpenChange={vi.fn()}
            templateId={template.id}
            canCreateForms={canCreateForms}
          />,
        );

        // Assert
        expect(await screen.findByText("Please wait...")).toBeDefined();
        expect(queryUseTemplateButton() !== null).toBe(canCreateForms);
      },
    );
  },
);
