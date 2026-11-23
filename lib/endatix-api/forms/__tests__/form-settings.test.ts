import { expect, it, vi } from "vitest";
import { EndatixApi } from "../../endatix-api";

it("replaces just the PDF section using the exact version the editor read", async () => {
  // Arrange
  const api = new EndatixApi("session", {
    baseUrl: "https://example.test/api",
  });
  const patch = vi
    .spyOn(api, "patch")
    .mockResolvedValue({ success: true, data: {} });
  // Act
  await api.forms.updatePdfSettings("42", {
    version: "9007199254740993",
    pdf: { usesFormTheme: true },
  });
  // Assert
  expect(patch).toHaveBeenCalledWith(
    "/forms/42/settings",
    { pdf: { usesFormTheme: true } },
    {
      headers: { "If-Match": '"9007199254740993"' },
    },
  );
});
