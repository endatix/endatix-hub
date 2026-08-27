import {
  AssetStorageContext,
  type AssetStorageContextValue,
} from "@/features/asset-storage/client";
import type { SurveyJsComponent } from "@/__tests__/utils/test-utils";
import { clientStorageConfig } from "../../../test-storage-config";
import { ProtectedSurveyFileItem } from "@/features/asset-storage/use-cases/view-protected-files/ui/protected-file-item";
import { render, screen } from "@testing-library/react";
import { Model, QuestionFileModel } from "survey-core";
import { Survey } from "survey-react-ui";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/features/asset-storage/ui/storage-presigned-image", () => ({
  StoragePresignedImage: ({ src, alt }: { src: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} data-testid="storage-presigned-image" src={src} />
  ),
}));

vi.mock("@/features/asset-storage/ui/storage-presigned-link", () => ({
  StoragePresignedLink: ({
    href,
    children,
  }: {
    href: string;
    children?: ReactNode;
  }) => (
    <a data-testid="storage-presigned-link" href={href}>
      {children}
    </a>
  ),
}));

const FILE_URL = "https://testaccount.blob.core.windows.net/content/doc.pdf";

function privateStorageContext(): AssetStorageContextValue {
  return {
    config: clientStorageConfig({ isEnabled: true, isPrivate: true }),
    enqueuePrivateReadUrls: vi.fn(async () => new Map()),
    mergePrivateReadUrlCache: vi.fn(),
    getCachedPrivateReadUrl: vi.fn(() => null),
    readUrlCacheVersion: 0,
  };
}

function createFileQuestion(value?: unknown): QuestionFileModel {
  const survey = new Model({
    elements: [{ type: "file", name: "upload", title: "Upload a file" }],
  });
  const question = survey.getQuestionByName("upload") as QuestionFileModel;
  if (value !== undefined) {
    question.value = value;
  }
  return question;
}

function renderProtectedItem(
  question: QuestionFileModel,
  item: { content?: string; name?: string },
  context: AssetStorageContextValue,
) {
  const instance = new ProtectedSurveyFileItem({
    question,
    item,
  }) as unknown as SurveyJsComponent & { context: AssetStorageContextValue };
  instance.context = context;

  return render(
    <AssetStorageContext.Provider value={context}>
      {instance.renderElement()}
    </AssetStorageContext.Provider>,
  );
}

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe("ProtectedSurveyFileItem (SurveyJS file question)", () => {
  it("renders an empty file question without a preview item", () => {
    globalThis.ResizeObserver ??=
      ResizeObserverStub as unknown as typeof ResizeObserver;

    const question = createFileQuestion();
    const model = question.survey as Model;

    const { container } = render(<Survey model={model} />);

    expect(question.isEmpty()).toBe(true);
    expect(question.showPreviewContainer).toBe(false);
    expect(container.textContent).toContain("Upload a file");
    expect(question.getRemoveButtonCss).toBeUndefined();
  });

  it("renders a file preview under private storage without getRemoveButtonCss", () => {
    const file = {
      name: "doc.pdf",
      type: "application/pdf",
      content: FILE_URL,
    };
    const question = createFileQuestion([file]);
    const item = question.previewValue[0] ?? file;
    const context = privateStorageContext();

    expect(() => renderProtectedItem(question, item, context)).not.toThrow();

    expect(screen.getByText("doc.pdf")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Remove doc.pdf" }),
    ).toBeDefined();
    expect(question.getRemoveFileButton(item)).toBeTruthy();
    expect(question.cssClasses.removeFileButton).toBeTruthy();
  });
});
