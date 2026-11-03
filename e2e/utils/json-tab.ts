import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";

const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;

/** Opens Creator's JSON Editor tab, from the tab strip or its More menu. */
export async function openJsonTab(page: Page): Promise<void> {
  await expect(
    page.getByRole("tab", { name: "Designer", exact: true }),
  ).toBeVisible();
  const jsonTab = page.getByRole("tab", { name: "JSON Editor", exact: true });
  if (!(await jsonTab.isVisible())) {
    await page
      .getByRole("tablist")
      .getByRole("button", { name: "More", exact: true })
      .click();
  }
  const jsonItem = page.getByRole("menuitem", {
    name: "JSON Editor",
    exact: true,
  });
  if (await jsonItem.isVisible()) {
    await jsonItem.click();
  } else {
    await jsonTab.click();
  }
}

/** Ace ignores keyboard.insertText. Select all, then Ace's own paste command. */
export async function pasteIntoAce(
  page: Page,
  text: string,
  expectedText: string,
): Promise<void> {
  const editor = page.locator(".ace_editor");
  await editor.click();
  await page.evaluate((value) => {
    const root = document.querySelector(".ace_editor");
    const ace = (
      window as Window & {
        ace?: {
          edit: (el: Element) => {
            focus: () => void;
            selectAll: () => void;
            execCommand: (command: string, args: string) => void;
          };
        };
      }
    ).ace;
    if (!root || !ace) {
      throw new Error("Ace is not loaded");
    }
    const aceEditor = ace.edit(root);
    aceEditor.focus();
    aceEditor.selectAll();
    aceEditor.execCommand("paste", value);
  }, text);
  await expect(editor).toContainText(expectedText);
}

/** Screenshots a region into E2E_EVIDENCE_DIR, when it is set. */
export async function saveEvidence(
  page: Page,
  region: Locator,
  name: string,
): Promise<void> {
  if (!EVIDENCE_DIR) {
    return;
  }
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  await region.screenshot({ path: path.join(EVIDENCE_DIR, name) });
}
