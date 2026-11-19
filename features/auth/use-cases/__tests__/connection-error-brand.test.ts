import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Brand } from "@/lib/branding";
import { BUILT_IN_LAYER, mergeBrand } from "@/lib/branding/layers";
import { packBrand } from "@/test/pack-brand";

const current: { brand: Brand } = { brand: mergeBrand([BUILT_IN_LAYER]) };

vi.mock("@/lib/branding/server", () => ({
  getBrand: async () => current.brand,
}));
vi.mock("@/services/api", () => ({
  sendVerification: vi.fn(),
  verifyEmail: vi.fn(),
  register: vi.fn(),
}));

const { sendVerification, verifyEmail, register } =
  await import("@/services/api");
const { sendVerificationAction } =
  await import("../send-verification/send-verification.action");
const { verifyEmailAction } =
  await import("../verify-email/verify-email.action");
const { createAccountAction } =
  await import("../create-account/create-account.action");

const refused = () =>
  new Error("fetch failed", { cause: { code: "ECONNREFUSED" } });

const message = (name: string) =>
  `Failed to connect to the ${name} API. Ensure your network connection and app settings are correct`;

function accountForm(): FormData {
  const form = new FormData();
  form.set("email", "user@example.com");
  form.set("password", "Passw0rd!123");
  form.set("confirmPassword", "Passw0rd!123");
  return form;
}

const actions: [string, () => Promise<{ errorMessage?: string }>][] = [
  [
    "send verification",
    () => {
      vi.mocked(sendVerification).mockRejectedValue(refused());
      return sendVerificationAction("user@example.com");
    },
  ],
  [
    "verify email",
    () => {
      vi.mocked(verifyEmail).mockRejectedValue(refused());
      return verifyEmailAction("token");
    },
  ],
  [
    "create account",
    () => {
      vi.mocked(register).mockRejectedValue(refused());
      return createAccountAction(undefined as never, accountForm());
    },
  ],
];

describe("auth actions name the brand's API when it is unreachable", () => {
  beforeEach(() => {
    current.brand = mergeBrand([BUILT_IN_LAYER]);
  });

  it.each(actions)("%s keeps the Endatix text with no pack", async (_, run) => {
    expect((await run()).errorMessage).toBe(message("Endatix"));
  });

  it.each(actions)("%s names the pack", async (_, run) => {
    current.brand = packBrand();

    expect((await run()).errorMessage).toBe(message("Example Forms"));
  });
});
