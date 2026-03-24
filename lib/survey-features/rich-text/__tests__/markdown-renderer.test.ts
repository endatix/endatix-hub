import { describe, expect, it, vi, beforeEach } from "vitest";
import { registerMarkdownRenderer } from "../markdown-renderer";
import { SurveyModel, TextMarkdownEvent } from "survey-core";
import { Survey } from "survey-react-ui";

vi.mock("@/lib/utils/html-sanitizer", () => ({
  htmlSanitizer: {
    sanitize: vi.fn((html: string) => html),
  },
}));

vi.mock("survey-core", () => ({
  SurveyModel: class MockSurveyModel {
    onTextMarkdown = { add: vi.fn(), remove: vi.fn() };
  },
  TextMarkdownEvent: class MockTextMarkdownEvent {
    text = "";
    html = "";
  },
}));

describe("registerMarkdownRenderer", () => {
  let mockSurveyModel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSurveyModel = {
      onTextMarkdown: {
        add: vi.fn(
          (
            handler: (sender: SurveyModel, options: TextMarkdownEvent) => void,
          ) => {
            mockSurveyModel._handler = handler;
          },
        ),
        remove: vi.fn(),
      },
      _handler: null as
        | ((sender: SurveyModel, options: TextMarkdownEvent) => void)
        | null,
    };
  });

  it("should add a handler to onTextMarkdown event", () => {
    registerMarkdownRenderer(mockSurveyModel);
    expect(mockSurveyModel.onTextMarkdown.add).toHaveBeenCalledTimes(1);
  });

  it("should return a cleanup function", () => {
    const cleanup = registerMarkdownRenderer(mockSurveyModel);
    expect(typeof cleanup).toBe("function");
    cleanup();
    expect(mockSurveyModel.onTextMarkdown.remove).toHaveBeenCalledTimes(1);
  });

  it("should render markdown to HTML", async () => {
    const { htmlSanitizer } = await import("@/lib/utils/html-sanitizer");
    vi.mocked(htmlSanitizer.sanitize).mockImplementation(
      (html: string) => html,
    );

    registerMarkdownRenderer(mockSurveyModel);
    const handler = mockSurveyModel._handler!;
    const options = { text: "**bold**", html: "" };

    handler(null, options);

    expect(options.html).toBe("<strong>bold</strong>");
  });

  it("should handle empty text and not modify html", () => {
    registerMarkdownRenderer(mockSurveyModel);
    const handler = mockSurveyModel._handler!;
    const options = { text: "", html: "" };

    handler(null, options);

    expect(options.html).toBe("");
  });

  it("should handle null text and not modify html", () => {
    registerMarkdownRenderer(mockSurveyModel);
    const handler = mockSurveyModel._handler!;
    const options = { text: null as any, html: "" };

    handler(null, options);

    expect(options.html).toBe("");
  });

  it("should sanitize HTML after rendering", async () => {
    const { htmlSanitizer } = await import("@/lib/utils/html-sanitizer");
    vi.mocked(htmlSanitizer.sanitize).mockImplementation((html: string) =>
      html.replace("<script>", ""),
    );

    registerMarkdownRenderer(mockSurveyModel);
    const handler = mockSurveyModel._handler!;
    const options = { text: "**bold**", html: "" };

    handler(null, options);

    expect(htmlSanitizer.sanitize).toHaveBeenCalled();
  });

  it("should unwrap single paragraph after sanitization", () => {
    registerMarkdownRenderer(mockSurveyModel);
    const handler = mockSurveyModel._handler!;
    const options = { text: "simple text", html: "" };

    handler(null, options);

    expect(options.html).toBe("simple text");
  });

  it("should handle inline links", () => {
    registerMarkdownRenderer(mockSurveyModel);
    const handler = mockSurveyModel._handler!;
    const options = { text: "[link](https://example.com)", html: "" };

    handler(null, options);

    expect(options.html).toContain('<a href="https://example.com">');
  });

  it("should handle inline code", () => {
    registerMarkdownRenderer(mockSurveyModel);
    const handler = mockSurveyModel._handler!;
    const options = { text: "`code`", html: "" };

    handler(null, options);

    expect(options.html).toContain("<code>");
  });

  it("should handle multi-paragraph content", () => {
    registerMarkdownRenderer(mockSurveyModel);
    const handler = mockSurveyModel._handler!;
    const options = { text: "para1\n\npara2", html: "" };

    handler(null, options);

    expect(options.html).toBe("para1\n\npara2");
  });
});
