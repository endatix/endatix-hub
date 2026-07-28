import { describe, expect, it, beforeAll } from "vitest";
import { Model, SurveyModel } from "survey-core";
import type { QuestionHtmlModel } from "survey-core";
import { installSurveyHtmlSanitizer } from "../sanitize-survey-html";

/**
 * These tests drive the real survey-core rendering paths rather than mocking
 * them: the value of the fix is precisely that the library's own getters (the
 * ones survey-react-ui feeds to `dangerouslySetInnerHTML`) return sanitized
 * markup. Mocking survey-core would assert nothing about that.
 */
beforeAll(() => {
  installSurveyHtmlSanitizer();
});

const XSS = `<img src=x onerror="alert('XSS')">`;

function htmlQuestionSurvey(html: string): Model {
  return new Model({
    pages: [{ name: "p1", elements: [{ type: "html", name: "h1", html }] }],
  });
}

function renderedHtmlQuestion(survey: Model): string {
  const question = survey.getQuestionByName("h1") as QuestionHtmlModel;
  return question.processedHtml;
}

describe("survey HTML sanitizer", () => {
  describe("blocks the HTML-bearing survey properties", () => {
    it("strips event handlers from an html question", () => {
      const rendered = renderedHtmlQuestion(htmlQuestionSurvey(XSS));

      expect(rendered).not.toContain("onerror");
      expect(rendered).not.toContain("alert");
    });

    it("strips event handlers from completedHtml", () => {
      const survey = new Model({
        completedHtml: XSS,
        pages: [{ name: "p1", elements: [{ type: "text", name: "q1" }] }],
      });

      expect(survey.processedCompletedHtml).not.toContain("onerror");
    });

    it("strips event handlers from completedHtmlOnCondition", () => {
      const survey = new Model({
        completedHtml: "safe fallback",
        completedHtmlOnCondition: [{ expression: "true", html: XSS }],
        pages: [{ name: "p1", elements: [{ type: "text", name: "q1" }] }],
      });

      expect(survey.processedCompletedHtml).not.toContain("onerror");
    });

    it("strips event handlers from completedBeforeHtml", () => {
      const survey = new Model({
        completedBeforeHtml: XSS,
        pages: [{ name: "p1", elements: [{ type: "text", name: "q1" }] }],
      });

      expect(survey.locCompletedBeforeHtml.renderedHtml).not.toContain(
        "onerror",
      );
    });

    it("strips event handlers from loadingHtml", () => {
      const survey = new Model({
        loadingHtml: XSS,
        pages: [{ name: "p1", elements: [{ type: "text", name: "q1" }] }],
      });

      expect(survey.locLoadingHtml.renderedHtml).not.toContain("onerror");
    });

    it.each([
      ["script tag", `<script>alert('XSS')</script>`, "alert"],
      ["svg onload", `<svg/onload=alert('XSS')>`, "onload"],
      ["iframe", `<iframe src="javascript:alert(1)"></iframe>`, "iframe"],
      [
        "javascript: href",
        `<a href="javascript:alert(1)">x</a>`,
        "javascript:",
      ],
    ])("strips %s", (_label, payload, forbidden) => {
      const rendered = renderedHtmlQuestion(htmlQuestionSurvey(payload));

      expect(rendered).not.toContain(forbidden);
    });
  });

  describe("closes the text-piping bypass", () => {
    it("sanitizes answer values piped into an html question", () => {
      // Piping runs after onProcessHtml, so a sanitizer registered on that
      // event would let this through. A respondent needs no edit rights.
      const survey = htmlQuestionSurvey("Hello {q1}");
      survey.setValue("q1", XSS);

      const rendered = renderedHtmlQuestion(survey);

      expect(rendered).toContain("Hello");
      expect(rendered).not.toContain("onerror");
    });

    it("sanitizes answer values piped into completedHtml", () => {
      const survey = new Model({
        completedHtml: "Thanks {q1}",
        pages: [{ name: "p1", elements: [{ type: "text", name: "q1" }] }],
      });
      survey.setValue("q1", XSS);

      expect(survey.processedCompletedHtml).not.toContain("onerror");
    });
  });

  describe("preserves legitimate authored content", () => {
    it("keeps table cell content", () => {
      const rendered = renderedHtmlQuestion(
        htmlQuestionSurvey(
          "<table><tbody><tr><td><strong>cell</strong></td></tr></tbody></table>",
        ),
      );

      expect(rendered).toContain("<td>");
      expect(rendered).toContain("<strong>cell</strong>");
    });

    it("keeps headings, lists and images", () => {
      const rendered = renderedHtmlQuestion(
        htmlQuestionSurvey(
          `<h2>Title</h2><ul><li><p>item <strong>bold</strong></p></li></ul><img src="https://example.com/a.png" alt="a">`,
        ),
      );

      expect(rendered).toContain("<h2>Title</h2>");
      expect(rendered).toContain("<strong>bold</strong>");
      expect(rendered).toContain('src="https://example.com/a.png"');
    });

    it("hardens external links instead of dropping them", () => {
      const rendered = renderedHtmlQuestion(
        htmlQuestionSurvey(`<a href="https://example.com">link</a>`),
      );

      expect(rendered).toContain('href="https://example.com"');
      expect(rendered).toContain("noopener");
      expect(rendered).toContain("noreferrer");
    });

    it("still pipes plain answer values", () => {
      const survey = htmlQuestionSurvey("<p>Hello {q1}</p>");
      survey.setValue("q1", "Ada");

      expect(renderedHtmlQuestion(survey)).toContain("Hello Ada");
    });
  });

  describe("installation", () => {
    it("is idempotent, so wrappers never stack", () => {
      const alreadyPatched = SurveyModel.prototype.processHtml;

      installSurveyHtmlSanitizer();
      installSurveyHtmlSanitizer();

      expect(SurveyModel.prototype.processHtml).toBe(alreadyPatched);
    });

    it("leaves consumer onProcessHtml handlers working", () => {
      const survey = htmlQuestionSurvey("<p>original</p>");
      survey.onProcessHtml.add((_, options) => {
        options.html = "<p>replaced</p>";
      });

      expect(renderedHtmlQuestion(survey)).toContain("replaced");
    });
  });
});
