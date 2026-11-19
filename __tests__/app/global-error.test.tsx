import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GlobalError from "@/app/global-error";

vi.mock("@/components/error-handling/error-page", () => ({
  UnexpectedErrorView: () => <p>Something went wrong</p>,
}));

vi.mock("@/lib/fonts/geist-local", () => ({
  geistSans: { variable: "" },
  geistMono: { variable: "" },
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function renderPage() {
  render(<GlobalError error={new Error("boom")} retry={() => {}} />);
}

describe("GlobalError", () => {
  it("links the deployment brand's icon and stylesheet through the fixed aliases", () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response("Example Forms"));

    // Act
    renderPage();

    // Assert
    const icon = document.querySelector("link[rel='icon']");
    const stylesheet = document.querySelector("link[rel='stylesheet']");
    expect(icon?.getAttribute("href")).toBe("/brand/icon");
    expect(stylesheet?.getAttribute("href")).toBe("/brand/brand.css");
  });

  it("names the brand in the title, read from the Hub without the API", async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response("Example Forms"));

    // Act
    renderPage();

    // Assert
    expect(fetchMock).toHaveBeenCalledWith("/brand/name");
    await waitFor(() =>
      expect(document.querySelector("title")?.textContent).toBe(
        "Something went wrong | Example Forms",
      ),
    );
  });

  it("keeps a title without a name when the name cannot be read", async () => {
    // Arrange
    fetchMock.mockRejectedValue(new TypeError("offline"));

    // Act
    renderPage();

    // Assert
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(document.querySelector("title")?.textContent).toBe(
      "Something went wrong",
    );
  });
});
