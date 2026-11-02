import { test } from "@playwright/test";

/**
 * Annotates each form id, runs the body, then deletes on success.
 * On a thrown body, or when E2E_KEEP_DATA=1, the release callback is asked to keep the forms.
 */
export async function runE2eForms(
  formIds: readonly string[],
  release: (keep: boolean) => Promise<"deleted" | "kept">,
  body: () => Promise<void>,
): Promise<void> {
  for (const formId of formIds) {
    test.info().annotations.push({ type: "formId", description: formId });
  }

  let failed = false;
  try {
    await body();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    const outcome = await release(failed || process.env.E2E_KEEP_DATA === "1");
    test.info().annotations.push({
      type: "forms",
      description: `${outcome}: ${formIds.join(", ")}`,
    });
  }
}
