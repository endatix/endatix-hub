import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAgentAction } from "../create-agent.action";
import { updateAgentAction } from "../update-agent.action";
import { ensureAuthenticated } from "@/features/auth";
import { EndatixApi } from "@/lib/endatix-api";

vi.mock("@/features/auth", () => ({
  ensureAuthenticated: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/endatix-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/endatix-api")>()),
  EndatixApi: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const signedOut = new Error("NEXT_REDIRECT /login");

function agentForm(): FormData {
  const formData = new FormData();
  formData.set("name", "Helper");
  return formData;
}

describe("agent actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureAuthenticated).mockRejectedValue(signedOut);
  });

  it("does not create an agent for a signed-out user", async () => {
    await expect(createAgentAction(agentForm())).rejects.toBe(signedOut);
    expect(EndatixApi).not.toHaveBeenCalled();
  });

  it("does not update an agent for a signed-out user", async () => {
    await expect(updateAgentAction("1", agentForm())).rejects.toBe(signedOut);
    expect(EndatixApi).not.toHaveBeenCalled();
  });
});
