import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { PdfThemeSwitch } from "../pdf-theme-switch";
import { savePdfSettings } from "../save-pdf-settings.action";
import { reloadPage } from "@/lib/utils/reload-page";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("../save-pdf-settings.action", () => ({ savePdfSettings: vi.fn() }));
vi.mock("@/lib/utils/reload-page", () => ({ reloadPage: vi.fn() }));

const settings = { version: "0", pdf: { usesFormTheme: false } };

beforeEach(() => {
  vi.mocked(savePdfSettings).mockResolvedValue(Result.success(settings));
});

it("disables the pending switch and displays a stale write without resubmitting", async () => {
  // Arrange
  const pending =
    Promise.withResolvers<Awaited<ReturnType<typeof savePdfSettings>>>();
  vi.mocked(savePdfSettings).mockReturnValueOnce(pending.promise);
  render(<PdfThemeSwitch formId="42" settings={settings} />);
  const toggle = screen.getByRole("switch", { name: /form’s theme/ });

  // Act
  fireEvent.click(toggle);
  expect(toggle.hasAttribute("disabled")).toBe(true);
  pending.resolve(
    Result.error(
      "Settings changed. Reload and try again.",
      undefined,
      undefined,
      { statusCode: 412 },
    ),
  );

  // Assert
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Settings changed",
  );
  expect(toggle.getAttribute("aria-checked")).toBe("false");
  expect(savePdfSettings).toHaveBeenCalledExactlyOnceWith("42", {
    version: "0",
    pdf: { usesFormTheme: true },
  });
  expect(refresh).toHaveBeenCalledOnce();
});

it("reads the saved settings again after a successful change", async () => {
  // Arrange
  render(<PdfThemeSwitch formId="42" settings={settings} />);

  // Act
  fireEvent.click(screen.getByRole("switch"));

  // Assert
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(screen.queryByRole("alert")).toBeNull();
});

it("requires a fresh settings page after losing the save response", async () => {
  // Arrange
  vi.mocked(savePdfSettings).mockRejectedValueOnce(
    new TypeError("Network error"),
  );
  const view = render(<PdfThemeSwitch formId="42" settings={settings} />);
  const toggle = screen.getByRole("switch");

  // Act
  fireEvent.click(toggle);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Could not confirm the save",
  );
  expect(toggle.hasAttribute("disabled")).toBe(true);
  fireEvent.click(toggle);
  fireEvent.click(screen.getByRole("button", { name: "Reload settings" }));

  // Assert: no replay; after reload, the committed value and version govern the next write.
  expect(savePdfSettings).toHaveBeenCalledTimes(1);
  expect(reloadPage).toHaveBeenCalledOnce();
  view.unmount();
  render(
    <PdfThemeSwitch
      formId="42"
      settings={{ version: "1", pdf: { usesFormTheme: true } }}
    />,
  );
  expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByRole("switch"));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(savePdfSettings).toHaveBeenLastCalledWith("42", {
    version: "1",
    pdf: { usesFormTheme: false },
  });
});
