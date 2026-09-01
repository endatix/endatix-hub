import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthErrorType } from "@/features/auth/shared/auth.types";

vi.mock("next/server", () => ({}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

async function renderAuthError(
  error: string | undefined,
  { isLoggedIn = false }: { isLoggedIn?: boolean } = {},
) {
  const { auth } = await import("@/auth");
  vi.mocked(auth).mockResolvedValue(
    (isLoggedIn ? { user: { id: "u1" } } : null) as never,
  );

  const AuthErrorPage = (await import("@/app/(auth)/auth-error/page")).default;
  const page = await AuthErrorPage({
    searchParams: Promise.resolve({ error }),
  });

  return render(page);
}

describe("Auth error page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * A stopped API never answered, so nothing rejected the caller's credentials.
   * Labelling that 401 tells the reader their sign-in was refused when the real
   * story is that the service was unreachable.
   */
  it("shows an unreachable service as 503, not 401", async () => {
    // Arrange & Act
    await renderAuthError(AuthErrorType.Network);

    // Assert
    expect(screen.getByText("503")).toBeDefined();
    expect(screen.queryByText("401")).toBeNull();
    expect(screen.getByText("Connection problem")).toBeDefined();
    expect(screen.getByText("Network")).toBeDefined();
  });

  it("shows a rejected session as 401 while signed in", async () => {
    // Arrange & Act
    await renderAuthError(AuthErrorType.InvalidToken, { isLoggedIn: true });

    // Assert
    expect(screen.getByText("401")).toBeDefined();
    expect(screen.getByText("Authorization failed")).toBeDefined();
    expect(screen.getByRole("link", { name: /sign out/i })).toBeDefined();
  });

  /**
   * A lapsed token while signed out is just a stale session, so it keeps the
   * generic sign-in copy — only the support code says which branch it was.
   */
  it("softens a rejected token to the generic 500 copy while signed out", async () => {
    // Arrange & Act
    await renderAuthError(AuthErrorType.InvalidToken);

    // Assert
    expect(screen.getByText("500")).toBeDefined();
    expect(screen.getByText("Authentication failed")).toBeDefined();
    expect(screen.getByText("InvalidToken")).toBeDefined();
    expect(screen.getByRole("link", { name: /go to sign in/i })).toBeDefined();
  });

  it.each([
    [AuthErrorType.Configuration, "Configuration"],
    [AuthErrorType.Server, "Server"],
    [AuthErrorType.Unknown, "Unknown"],
  ])("shows %s as a 500 server-side failure", async (error, code) => {
    // Arrange & Act
    await renderAuthError(error);

    // Assert
    expect(screen.getByText("500")).toBeDefined();
    expect(screen.getByText(code)).toBeDefined();
  });

  it("falls back to the unknown presentation for an unrecognised error", async () => {
    // Arrange & Act
    await renderAuthError("not-a-real-error-type");

    // Assert
    expect(screen.getByText("500")).toBeDefined();
    expect(screen.getByText("Unknown")).toBeDefined();
  });
});
