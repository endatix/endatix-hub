import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DesignSurveyProvider,
  useSurveyDesigner,
} from "@/lib/survey-features/designer/design-survey.context";
import { Result } from "@/lib/result";

const surveyCreator = vi.hoisted(() => vi.fn());
const canvas = vi.hoisted(() => ({ title: "Edited" }));

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
    getJsonModel: () => Result.success({ ...canvas }),
    captureJsonSave: () => () => true,
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
  applyFormDiagnosticsAudience: vi.fn(),
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

const draft = vi.hoisted(() => ({
  edit: vi.fn(),
  resume: vi.fn(),
  isSaved: false,
  view: { status: "saving", head: { jsonData: "{}" } },
}));
vi.mock("@endatix/survey-journal", () => ({ captureJournal: () => vi.fn() }));
vi.mock("../../../edit-draft/draft-editor-context", async () => ({
  LegacyScope: (await import("react")).createContext("test"),
  useEditorDraft: () => ({ controller: draft, view: draft.view }),
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

function EditIndicator() {
  const { isJsonModified, setIsJsonModified } = useSurveyDesigner();
  return (
    <button onClick={() => setIsJsonModified(true)}>
      {isJsonModified ? "Modified" : "Clean"}
    </button>
  );
}

it("preserves a rejected form edit so the same save can be retried", async () => {
  // Arrange
  const ready = vi.fn<(save: () => Promise<void>) => void>();
  draft.isSaved = false;
  render(
    <DesignSurveyProvider>
      <FormEditor
        formJson={{}}
        formId="1"
        formName="Form"
        themeId="default"
        onSaveHandlerReady={ready}
      />
      <EditIndicator />
    </DesignSurveyProvider>,
  );
  await waitFor(() => expect(surveyCreator).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Clean" }));
  const save = () => act(() => ready.mock.lastCall![0]());

  // Act & Assert
  await save();
  expect(screen.getByRole("button", { name: "Modified" })).toBeTruthy();
  draft.isSaved = true;
  await save();
  expect(screen.getByRole("button", { name: "Clean" })).toBeTruthy();
  expect(draft.edit).toHaveBeenNthCalledWith(2, '{"title":"Edited"}');
});

function CanvasEditIndicator() {
  const { hasUnsavedChanges, setHasUnsavedChanges } = useSurveyDesigner();
  return <button onClick={() => setHasUnsavedChanges(true)}>{hasUnsavedChanges ? "Unsaved canvas" : "Clean canvas"}</button>;
}

it("keeps a newer unrecorded canvas dirty across a delayed save and a refocus acknowledgement", async () => {
  // Arrange
  const ready = vi.fn<(save: () => Promise<void>) => void>();
  const latch = Promise.withResolvers<void>();
  draft.resume.mockImplementationOnce(() => latch.promise);
  const view = () => <DesignSurveyProvider>
    <FormEditor formJson={{}} formId="1" formName="Form" themeId="default" onSaveHandlerReady={ready} />
    <CanvasEditIndicator />
  </DesignSurveyProvider>;
  const mounted = render(view());
  await waitFor(() => expect(surveyCreator).toHaveBeenCalled());
  fireEvent.click(screen.getByText("Clean canvas"));
  const pending = ready.mock.lastCall![0]();
  await waitFor(() => expect(draft.resume).toHaveBeenCalled());
  canvas.title = "Edited again during save";

  // Act
  draft.isSaved = true;
  await act(async () => { latch.resolve(); await pending; });
  draft.view = { status: "saved", head: { jsonData: '{"title":"Edited"}' } };
  mounted.rerender(view());

  // Assert
  expect(screen.getByText("Unsaved canvas")).toBeTruthy();
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(false);
  await act(() => ready.mock.lastCall![0]());
  expect(draft.edit).toHaveBeenLastCalledWith('{"title":"Edited again during save"}');
  expect(screen.getByText("Clean canvas")).toBeTruthy();
});

beforeEach(() => {
  canvas.title = "Edited";
  draft.isSaved = false;
  draft.view = { status: "saving", head: { jsonData: "{}" } };
});

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
