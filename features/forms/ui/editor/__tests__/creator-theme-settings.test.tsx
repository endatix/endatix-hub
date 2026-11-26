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
import { updateFormDefinitionJsonAction } from "@/features/forms/application/actions/update-form-definition-json.action";
import { updateFormThemeAction } from "@/features/themes/update-form-theme";
import { updateTemplateJsonAction } from "@/features/form-templates/application/update-template-json.action";

const surveyCreator = vi.hoisted(() => vi.fn());

vi.mock("survey-creator-react", () => {
  const event = () => ({ add: vi.fn(), remove: vi.fn() });

  return {
    SurveyCreator: class {
      onSurveyInstanceCreated = event();
      onModified = event();
      onElementGetActions = event();

      constructor(options: unknown) {
        surveyCreator(options, this);
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
    getJsonModel: (creator: { JSON: object }) => Result.success(creator.JSON),
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

vi.mock("@/lib/survey-features/survey-design/ui", async () => ({
  useCreatorTabUrl: vi.fn(),
  useCreatorJson: (await import("@/lib/survey-features/survey-design/ui/use-creator-json")).useCreatorJson,
  SurveyDesignSaveButton: (await import("@/lib/survey-features/survey-design/ui/survey-design-save-button")).SurveyDesignSaveButton,
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

vi.mock(
  "@/features/forms/application/actions/update-form-definition-json.action",
  () => ({
    updateFormDefinitionJsonAction: vi.fn(),
  }),
);

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
    <button onClick={() => {
      surveyCreator.mock.lastCall![1].JSON = { title: "Edited" };
      setIsJsonModified(true);
    }}>
      {isJsonModified ? "Modified" : "Clean"}
    </button>
  );
}

it("preserves a rejected form edit so the same save can be retried", async () => {
  // Arrange
  const ready = vi.fn<(save: () => Promise<void>) => void>();
  vi.mocked(updateFormDefinitionJsonAction)
    .mockResolvedValueOnce(Result.error("Save unavailable"))
    .mockResolvedValueOnce(Result.success("1"));
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
  await save();
  expect(screen.getByRole("button", { name: "Clean" })).toBeTruthy();
  expect(updateFormDefinitionJsonAction).toHaveBeenNthCalledWith(
    2,
    "1",
    false,
    { title: "Edited" },
  );
});

type EditorKind = "form" | "template";

async function mountEditor(kind: EditorKind) {
  const ready = vi.fn<(save: () => Promise<void>) => void>();
  const renderRead = (title: string, updatedAt: string) => {
    const revision = { id: "1", updatedAt };
    return kind === "template"
      ? <FormTemplateEditor templateId="1" templateName="Template" templateJson={{ title }} revision={revision} />
      : <DesignSurveyProvider>
          <FormEditor formId="1" formName="Form" formJson={{ title }} revision={revision} onSaveHandlerReady={ready} />
        </DesignSurveyProvider>;
  };
  const view = render(renderRead("A", "0"));
  await waitFor(() => expect(surveyCreator.mock.lastCall?.[1].JSON).toEqual({ title: "A" }));
  const creator = surveyCreator.mock.lastCall![1];
  const save = () => kind === "template"
    ? fireEvent.click(screen.getByRole("button", { name: "Save Template" }))
    : ready.mock.lastCall![0]();
  return { creator, save, read: (title: string, rev: string) => view.rerender(renderRead(title, rev)) };
}

function editCanvas(creator: { JSON: object; onModified: { add: ReturnType<typeof vi.fn> } }) {
  creator.JSON = { title: "B" };
  act(() => creator.onModified.add.mock.lastCall![0](creator, { type: "PROPERTY_CHANGED" }));
}

describe.each<EditorKind>(["form", "template"])("%s editor readbacks", kind => {
  const write = kind === "form" ? updateFormDefinitionJsonAction : updateTemplateJsonAction;

  it("applies an external restore after ignoring the stale read of the same saved draft", async () => {
    // Arrange
    const response = Promise.withResolvers<Result<string>>();
    vi.mocked(write).mockReturnValueOnce(response.promise);
    const editor = await mountEditor(kind);
    editCanvas(editor.creator);
    const saving = editor.save();
    await waitFor(() => expect(write).toHaveBeenCalledOnce());

    // Act & Assert
    editor.read("C", "2");
    response.resolve(Result.success("1"));
    await act(async () => { await saving; });
    editor.read("B", "1");
    expect(editor.creator.JSON).toEqual({ title: "C" });
    editor.read("B", "3");
    expect(editor.creator.JSON).toEqual({ title: "B" });
  });

  it("does not resubmit a canvas edit that a distinct external read has acknowledged", async () => {
    // Arrange
    const editor = await mountEditor(kind);
    editCanvas(editor.creator);
    const canvas = editor.creator.JSON;

    // Act
    editor.read("B", "1");
    await act(async () => { await editor.save(); });

    // Assert
    expect(editor.creator.JSON).toBe(canvas);
    expect(write).not.toHaveBeenCalled();
  });
});

describe("creator theme settings", () => {
  beforeEach(() => {
    surveyCreator.mockClear();
  });

  it("retains a pending theme assignment when an external read matches the edited canvas", async () => {
    // Arrange
    const editor = await mountEditor("form");
    editCanvas(editor.creator);
    editor.creator.theme = { id: "2", themeName: "New" };
    vi.mocked(updateFormDefinitionJsonAction).mockResolvedValueOnce(Result.success("1"));
    vi.mocked(updateFormThemeAction).mockResolvedValueOnce(Result.success(undefined));

    // Act
    editor.read("B", "1");
    await act(async () => { await editor.save(); });

    // Assert
    expect(updateFormThemeAction).toHaveBeenCalledWith({ formId: "1", themeId: "2" });
  });

  it("saves a theme selected during a pending definition save on the next Save", async () => {
    // Arrange
    const response = Promise.withResolvers<Result<string>>();
    vi.mocked(updateFormDefinitionJsonAction)
      .mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(Result.success("1"));
    vi.mocked(updateFormThemeAction).mockResolvedValueOnce(Result.success(undefined));
    const ready = vi.fn<(save: () => Promise<void>) => void>();
    render(
      <DesignSurveyProvider>
        <FormEditor formJson={{}} formId="1" formName="Form" themeId="default" onSaveHandlerReady={ready} />
        <EditIndicator />
      </DesignSurveyProvider>,
    );
    await waitFor(() => expect(surveyCreator).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Clean" }));

    // Act
    const pending = ready.mock.lastCall![0]();
    await waitFor(() => expect(updateFormDefinitionJsonAction).toHaveBeenCalled());
    surveyCreator.mock.lastCall![1].theme = { id: "2", themeName: "New" };
    response.resolve(Result.success("1"));
    await act(() => pending);
    await act(() => ready.mock.lastCall![0]());

    // Assert
    expect(updateFormThemeAction).toHaveBeenCalledWith({ formId: "1", themeId: "2" });
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
