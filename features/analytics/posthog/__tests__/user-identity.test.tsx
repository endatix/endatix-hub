import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useSessionIdentity } from "../client/hooks/use-identify";
import { PostHogUserIdentity } from "../client/user-identity";
import type { Session } from "next-auth";

vi.mock("../client/hooks/use-identify", () => ({
  useSessionIdentity: vi.fn(),
}));

describe("PostHogUserIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render nothing (null)", () => {
    const { container } = render(<PostHogUserIdentity session={null} />);

    expect(container.firstChild).toBeNull();
  });

  it("should call useSessionIdentity with session", () => {
    const session: Session = {
      user: { email: "identity@example.com", name: "Identity User" },
      expires: "2026-12-31",
    };

    render(<PostHogUserIdentity session={session} />);

    expect(useSessionIdentity).toHaveBeenCalledWith(session);
  });

  it("should call useSessionIdentity with undefined when session prop is omitted", () => {
    render(<PostHogUserIdentity />);

    expect(useSessionIdentity).toHaveBeenCalledWith(undefined);
  });

  it("should not render any visible content", () => {
    render(
      <div data-testid="wrapper">
        <PostHogUserIdentity
          session={{ user: { email: "a@b.com" }, expires: "" }}
        />
      </div>,
    );

    const wrapper = screen.getByTestId("wrapper");
    // Component returns null, so wrapper has no DOM children (or only comment nodes)
    expect(wrapper.innerHTML).toBe("");
  });
});
