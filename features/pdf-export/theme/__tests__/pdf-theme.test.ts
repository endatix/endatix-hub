import { expect, it } from "vitest";
import { formThemeToPdfLayer } from "../form-theme";

it("retains translucent border ink for compositing on each rendered surface", () => {
  // Arrange
  const themeModel = JSON.stringify({
    cssVariables: { "--sjs-border-default": "rgba(255, 255, 255, 0.5)" },
  });

  // Act & Assert
  expect(formThemeToPdfLayer({ themeModel }).border).toBe("#ffffff80");
});

it("reads the theme delivered with the submission, including SurveyJS colour references", () => {
  // Arrange
  const themeModel = JSON.stringify({
    cssVariables: {
      "--sjs-primary-backcolor": "rgba(225, 29, 72, 1)",
      "--sjs-general-backcolor-dim": "var(--paper)",
      "--paper": "#fed",
      "--sjs-border-default": "#123",
      "--sjs-general-forecolor": "#456",
      "--sjs-corner-radius": "8px",
    },
  });

  // Act & Assert
  expect(formThemeToPdfLayer({ themeModel })).toEqual({
    accent: "#e11d48",
    pageBackground: "#ffeedd",
    border: "#112233",
    tableBorder: "#112233",
    text: "#445566",
    radius: 8,
  });
});

it.each([
  ["var( --ink_2-a )", "#112233"],
  ["var(--missing, var(--other, rgba(255, 0, 0, 0.5)))", "#ff000080"],
  ["var(--ink_2-a, )", "#112233"],
  ["var(--ink_2-a,)", undefined],
  ["var(--ink_2-a, red\nblue)", undefined],
  ["var(--ink 2-a, #456)", undefined],
  ["var(--missing, #456", undefined],
  ["var(--loop)", undefined],
  ["var(--missing, #456)".padEnd(257), undefined],
])("resolves only supported variable references: %s", (reference, expected) => {
  // Arrange
  const themeModel = JSON.stringify({
    cssVariables: {
      "--sjs-general-forecolor": reference,
      "--ink_2-a": "#123",
      "--loop": "var(--loop)",
    },
  });

  // Act & Assert
  expect(formThemeToPdfLayer({ themeModel }).text).toBe(expected);
});

it.each([
  undefined,
  "",
  "null",
  "malformed",
  '{"cssVariables":null}',
  '{"cssVariables":{"--sjs-border-default":3}}',
])(
  "keeps the default PDF for an absent or unreadable theme: %s",
  (themeModel) => {
    expect(formThemeToPdfLayer({ themeModel })).toEqual({});
  },
);
