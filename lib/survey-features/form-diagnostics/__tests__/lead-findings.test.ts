import { expect, it } from "vitest";
import { leadConversion, manualFindings } from "../diagnostic-findings";
import { analyzeSurvey } from "../form-diagnostics-logic";

it("ranks runnable conversions before blocked ones, then compares their definition impact", () => {
  const images = { id: "images" as const, impact: 900, runnable: false };
  const choices = { id: "choices" as const, impact: 300, runnable: true };
  expect(leadConversion([images, choices])).toBe("choices");
  expect(leadConversion([{ ...images, runnable: true }, choices])).toBe("images");
  expect(leadConversion([images])).toBe("images");
  expect(leadConversion([])).toBeUndefined();
});

it("uses observed counts for evidence and qualitative benefits for every manual finding", () => {
  const stats = { ...analyzeSurvey("{}"), totalQuestions: 105, logicConditionsCount: 58, fileUploadWithoutBlobCount: 2 };
  const findings = manualFindings(stats, 2 ** 21, 3, 1);
  expect(findings.map(f => f.id).sort()).toEqual(["audience", "files", "length", "logic", "size"]);
  for (const finding of findings) {
    expect(finding.benefit.basis).toBe("Not measured");
    expect(finding.benefit.headline).toBeTruthy();
    expect(finding.consequence).toBeTruthy();
  }
  expect(findings.find(f => f.id === "files")?.evidence).toContain("2");
});
