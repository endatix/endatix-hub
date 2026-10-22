import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "../audio-player";

vi.mock("@/features/asset-storage/client", () => ({
  usePrivateStorageDisplayUrl: () => ({ displayUrl: undefined }),
}));

const recording = {
  name: "answer.wav",
  type: "audio/wav",
  content: "UklGRg==",
};

function renderReadyPlayer() {
  const { container } = render(<AudioPlayer file={recording} />);
  fireEvent.canPlay(container.querySelector("audio")!);
}

async function clickPlay() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
  });
}

describe("AudioPlayer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("goes back to Play when the browser refuses to play", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("Autoplay blocked", "NotAllowedError"),
    );
    renderReadyPlayer();

    await clickPlay();

    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  it("stays on Pause when play is only interrupted by pause", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("Interrupted", "AbortError"),
    );
    renderReadyPlayer();

    await clickPlay();

    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });
});
