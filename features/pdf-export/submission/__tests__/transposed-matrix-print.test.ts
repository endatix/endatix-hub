import { createElement as el } from "react";
import { Document, Page, View, pdf } from "@react-pdf/renderer";
import { Model, QuestionMatrixDynamicModel } from "survey-core";
import { expect, it, vi } from "vitest";
import "../submission-details-pdf";
import { loadMatrixFonts } from "../answers/matrix-print-bands";
import PdfMatrixDropdownAnswer from "../answers/pdf-matrixdropdown-answer";
import { FullWidthNote } from "../answers/pdf-transposed-matrix";
import { currentPdfStyles, withPdfStyles } from "../../theme/pdf-theme-context";
import { printedInk } from "./printed-ink";

type Node = { lines?: { string: string }[]; style?: { color?: string }; children?: Node[] };
function text(node: Node): string[] {
  return (
    node.lines?.map((line) => line.string) ??
    node.children?.flatMap((child) => text(child)) ??
    []
  );
}

it("keeps a wrapped note heading with its first two answer lines", async () => {
  // Arrange: 73 pt remain, enough for the old fixed reservation but not this note.
  await loadMatrixFonts();
  const heading = "[1] · Row 7 · " + "Observation field ".repeat(8);
  const source = Array.from({length: 100}, (_, i) => `Trial ${i}`).join("\n");
  const onRender = vi.fn();
  // Act
  await pdf(el(Document, {onRender}, el(Page, {size: "A4", style: {padding: 28}},
    el(View, {style: {height: 713}}), el(FullWidthNote, {heading, source})
  ))).toBlob();
  // Assert
  const pages: Node[] = onRender.mock.lastCall![0]._INTERNAL__LAYOUT__DATA_.children;
  const first = pages.map(page => text(page)).find(lines => lines.some(line => line.includes("Note [1]")));
  expect(first).toEqual(expect.arrayContaining(["Trial 0", "Trial 1"]));
});

type Positioned = { box: { left: number; width: number }; lines?: { string: string }[]; children?: Positioned[] };

function placedLines(node: Positioned, origin = 0): { text: string; x: number; width: number }[] {
  const x = origin + node.box.left;
  return node.lines?.map(line => ({ text: line.string, x, width: node.box.width })) ??
    node.children?.flatMap(child => placedLines(child, x)) ?? [];
}

it("insets the heading and body on every note fragment without losing a dense identifier", async () => {
  // Arrange
  await loadMatrixFonts();
  const token = "W".repeat(180);
  const source = ["First", token, ...Array.from({ length: 60 }, (_, i) => `Trial ${i}`)].join("\n");
  const onRender = vi.fn();
  // Act
  await pdf(el(Document, { onRender }, el(Page, { size: "A4", style: { padding: 28 } },
    el(FullWidthNote, { heading: "[1] · Row 7 · Observation", source }),
  ))).toBlob();
  const pages: Positioned[] = onRender.mock.lastCall![0]._INTERNAL__LAYOUT__DATA_.children;
  // Assert
  expect(pages.length).toBeGreaterThan(1);
  const payload = [];
  for (const page of pages) {
    const [title, ...body] = placedLines(page);
    expect(title.text).toBe("Note [1] · Row 7 · Observation");
    expect(body.length).toBeGreaterThan(0);
    expect([title, ...body].every(line => line.x === 36 && line.width <= 524)).toBe(true);
    payload.push(...body.map(line => line.text));
  }
  expect(payload.join("").replaceAll(/\s/g, "")).toBe(source.replaceAll(/\s/g, ""));
});

async function printPages(entries: { observation: string }[]) {
  const model = new Model({
    elements: [
      {
        type: "matrixdynamic",
        name: "Record",
        transposeData: true,
        columns: [
          { name: "observation", title: "Observation", cellType: "comment" },
        ],
      },
    ],
  });
  model.data = { Record: entries };
  const question = model.getQuestionByName("Record");
  if (!(question instanceof QuestionMatrixDynamicModel))
    throw new Error("Expected dynamic matrix");
  await loadMatrixFonts();
  const onRender = vi.fn();
  await pdf(
    el(
      Document,
      { onRender },
      el(
        Page,
        { size: "A4", style: { padding: 28, ...currentPdfStyles().page } },
        el(PdfMatrixDropdownAnswer, { question }),
      ),
    ),
  ).toBlob();
  return onRender.mock.lastCall![0]._INTERNAL__LAYOUT__DATA_.children as Node[];
}

async function print(entries: { observation: string }[]) {
  return (await printPages(entries)).map((page) => text(page));
}

it("prints group headings, answers and continued trials in readable ink on dark paper alone", async () => {
  // Arrange
  const themeModel = JSON.stringify({cssVariables: {"--sjs2-color-utility-surface-survey": "#121212"}});
  const trials = Array.from({length: 140}, (_, i) => `Trial ${i}`).join("\n");
  const entries = Array.from({length: 12}, (_, i) => ({observation: i === 6 ? trials : `Short-${i}`}));
  // Act
  const pages = await withPdfStyles({themeModel}, () => printPages(entries));
  const ink = new Map(pages.flatMap(page => printedInk(page)));
  // Assert
  for (const label of ["Group 1 of 2", "Record", "Short-0", "Trial 0", "Trial 139"])
    expect(ink.get(label), label).toBe("#ffffff");
  expect(pages.filter(page => text(page).some(line => line.startsWith("Trial "))).length).toBeGreaterThan(1);
});

it("keeps a full-width note with its identifiers on every page and its payload only once", async () => {
  // Arrange
  const markers = Array.from({ length: 140 }, (_, i) => `Observation-${i}`);
  const entries = Array.from({ length: 12 }, (_, i) => ({
    observation: i === 6 ? markers.join("\n") : `Short-${i}`,
  }));

  // Act
  const pages = await print(entries);

  // Assert
  const notePages = pages.filter((p) =>
    p.some((line) => markers.includes(line)),
  );
  expect(notePages.length).toBeGreaterThan(1);
  expect(notePages.flat().filter((line) => markers.includes(line))).toEqual(
    markers,
  );
  for (const page of notePages)
    expect(page).toContain("Note [1] · Row 7 · Observation");
  expect(pages.flat().filter((line) => line === "[1]")).toHaveLength(1);
  expect(
    pages.flat().filter((line) => line === "Observation").length,
  ).toBeGreaterThan(1);
});

it("fits three short observations together at print size", async () => {
  // Arrange
  const entries = ["First", "Second", "Third"].map((label) => ({
    observation: `${label} observer finished their task without a reminder.`,
  }));
  // Act
  const printed = (await print(entries)).flat();
  // Assert
  expect(printed.filter((line) => line === "Observation")).toHaveLength(1);
  expect(printed).toEqual(expect.arrayContaining(["Row 1", "Row 2", "Row 3"]));
});

it("wraps an unbroken identifier without inventing separator glyphs", async () => {
  // Arrange
  const identifier = "W".repeat(105);
  // Act
  const lines = (
    await print([{ observation: identifier }, { observation: "Short" }])
  )
    .flat()
    .filter((l) => l.includes("W"));
  // Assert
  expect(lines.length).toBeGreaterThan(1);
  expect(lines.join("")).toBe(identifier);
});

it("keeps a short mixed-direction numeric observation in reading order in a wide panel", async () => {
  // Arrange
  const entries = Array.from({length: 6}, () => ({observation: "Short"}));
  entries[3].observation = "Mixed \u200f(12)-(34)\u200f finish";
  // Act
  const printed = (await print(entries)).flat().map(line => line.replaceAll("\u200f", ""));
  // Assert
  expect(printed).toContain("Mixed (34)-(12) finish");
});
