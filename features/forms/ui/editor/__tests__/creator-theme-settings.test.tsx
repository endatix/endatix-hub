import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DesignSurveyProvider } from "@/lib/survey-features/designer/design-survey.context";

const surveyCreator = vi.hoisted(() => vi.fn());

vi.mock("survey-creator-react", () => {
  const event = () => ({ add: vi.fn(), remove: vi.fn() });

  return {
    SurveyCreator: class {
      onSurveyInstanceCreated = event();
      onModified = event();
      onElementGetActions = event();

      constructor(options: unknown) {
        surveyCreator(options);
      }
    },
    SurveyCreatorComponent: () => null,
  };
});

vi.mock("@/features/forms/ui/editor/survey-creator-custom-questions", () => ({
  loadBuiltInCustomQuestionClasses: vi.fn().mockResolvedValue([]),
  customizeQuestionClassesOnCreator: vi.fn(),
}));

vi.mock("@/lib/survey-extensions/ui/use-survey-extensions", () => ({
  useSurveyExtensions: () => ({
    isReady: true,
    onCreatorCreated: vi.fn(),
  }),
}));

vi.mock("@/lib/survey-extensions", () => ({
  ALL_EXTENSIONS: [],
  DATA_LISTS_RUNTIME_EXTENSION_ID: "data-lists",
  useSurveyExtensions: () => ({
    isReady: true,
    onCreatorCreated: vi.fn(),
  }),
}));

vi.mock("@/features/config/survey-license-provider", () => ({
  useSurveyLicenseKey: () => null,
}));

vi.mock("@/lib/designer-runtime", () => ({
  useDesignerRuntime: () => ({ stateRef: { current: {} } }),
}));

vi.mock("@/features/asset-storage/client", () => ({
  useStorageWithCreator: () => ({
    registerStorageHandlers: () => vi.fn(),
    isStorageReady: true,
  }),
}));

vi.mock("@/lib/survey-features/json-editor/use-json-editor.hook", () => ({
  useJsonEditor: () => ({
    registerJsonEditor: () => vi.fn(),
    getJsonModel: () => null,
  }),
}));

vi.mock("@/lib/survey-features/rich-text", () => ({
  useRichTextEditing: vi.fn(),
}));

vi.mock("@/lib/survey-features/summary-table", () => ({
  useLoopAwareSummaryTableEditing: vi.fn(),
}));

vi.mock("@/lib/survey-features/question-loops", () => ({
  useQuestionLoops: () => ({
    initGlobals: vi.fn(),
    bindToCreator: () => vi.fn(),
  }),
}));

vi.mock("@/lib/survey-features/any-answered", () => ({
  useAnyAnswered: () => ({ initGlobals: vi.fn() }),
}));

vi.mock("@/lib/survey-features/form-diagnostics", () => ({
  useFormDiagnostics: () => ({
    initGlobals: vi.fn(),
    bindToCreator: () => vi.fn(),
  }),
}));

vi.mock("@/lib/themes/use-endatix-themes", () => ({
  useEndatixCreatorTheme: () => ({ cssVariables: {}, colorPalette: "light" }),
}));

vi.mock("@/lib/themes/creator-theme", () => ({
  applyEndatixCreatorTheme: vi.fn(),
}));

vi.mock("@/lib/themes/survey-theme", () => ({
  registerThemes: vi.fn(),
}));

vi.mock("@/lib/survey-features/data-lists", () => ({
  useConvertInlineChoicesUi: () => ({ dialogProps: null }),
  ConvertInlineChoicesDialog: () => null,
}));

vi.mock("@/lib/survey-features/survey-design/ui", () => ({
  useCreatorTabUrl: vi.fn(),
  useCreatorJson: vi.fn(),
  SurveyDesignSaveButton: () => null,
  SurveyDesignStatusBadge: () => null,
}));

vi.mock("@/features/themes/manage-theme-editor", () => ({
  DEFAULT_THEME_ID: "default",
  ThemeDeleteDialog: () => null,
  ThemeSaveDialog: () => null,
  useThemeManagement: () => ({
    saveThemeHandler: vi.fn(),
    isThemeDirty: false,
    themeSaveRequest: null,
    themeDeleteRequest: null,
    closeThemeDeleteRequest: vi.fn(),
  }),
}));

vi.mock("@/customizations/questions/question-registry", () => ({
  customQuestions: [],
}));

vi.mock("@/lib/questions/question-loader-module", () => ({
  questionLoaderModule: { loadQuestion: vi.fn() },
}));

vi.mock("@/lib/questions/audio-recorder", () => ({
  registerAudioQuestionUI: vi.fn(),
}));

vi.mock("@/lib/questions/features/group-randomization", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/questions/infrastructure/specialized-survey-question", () => ({
  initializeCustomQuestions: vi.fn(() => []),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../application/actions/create-custom-question.action", () => ({
  createCustomQuestionAction: vi.fn(),
}));

vi.mock("../../application/actions/update-form-definition-json.action", () => ({
  updateFormDefinitionJsonAction: vi.fn(),
}));

vi.mock("@/features/themes/update-form-theme", () => ({
  updateFormThemeAction: vi.fn(),
}));

vi.mock(
  "@/features/form-templates/application/update-template-json.action",
  () => ({ updateTemplateJsonAction: vi.fn() }),
);

vi.mock(
  "@/features/form-templates/application/update-template-name.action",
  () => ({ updateTemplateNameAction: vi.fn() }),
);

import FormEditor from "../form-editor";
import FormTemplateEditor from "@/features/form-templates/ui/form-template-editor";

describe("creator theme settings", () => {
  beforeEach(() => {
    surveyCreator.mockClear();
  });

  it("constructs the form editor with creator theme settings off", async () => {
    // Arrange & Act
    render(
      <DesignSurveyProvider>
        <FormEditor
          formJson={{}}
          formId="1"
          formName="Form"
          options={{ showCreatorThemeSettings: true }}
        />
      </DesignSurveyProvider>,
    );

    // Assert
    await waitFor(() => {
      expect(surveyCreator).toHaveBeenCalled();
    });
    expect(surveyCreator.mock.calls[0][0]).toMatchObject({
      showCreatorThemeSettings: false,
    });
  });

  it("constructs the template editor with creator theme settings off", async () => {
    // Arrange & Act
    render(
      <FormTemplateEditor
        templateId="1"
        templateJson={{}}
        templateName="Template"
        options={{ showCreatorThemeSettings: true }}
      />,
    );

    // Assert
    await waitFor(() => {
      expect(surveyCreator).toHaveBeenCalled();
    });
    expect(surveyCreator.mock.calls.at(-1)?.[0]).toMatchObject({
      showCreatorThemeSettings: false,
    });
  });
});
