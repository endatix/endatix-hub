import { expect, it } from "vitest";
import { formThemeToPdfLayer } from "../form-theme";

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
