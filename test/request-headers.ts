import { vi } from "vitest";

// Direct calls to server components have no Next request context.
vi.mock("next/headers", async (original) => ({
  ...(await original<typeof import("next/headers")>()),
  headers: async () => new Headers(),
}));
