import { expect, type Locator, type Page } from "@playwright/test";

declare global {
  interface Window {
    __pagedListNoReload?: boolean;
  }
}

/** One paged Hub list, driven through its footer like a user would. */
export class PagedListPage {
  readonly rows: Locator;
  readonly nextPage: Locator;

  constructor(
    private readonly page: Page,
    rowsSelector: string,
  ) {
    this.rows = page.locator(rowsSelector);
    this.nextPage = page.getByRole("button", { name: "Go to next page" });
  }

  async open(url: string) {
    await this.page.goto(url);
    await expect(this.rows.first()).toBeVisible();
  }

  rowTexts(): Promise<string[]> {
    return this.rows.allInnerTexts();
  }

  /**
   * Soft-navigates to the next page and returns the rows it rendered.
   * Fails if the rows never change, if the change needed a full reload, or if
   * the pager moved out from under the pointer.
   */
  async goToNextPage(): Promise<string[]> {
    const before = await this.rowTexts();
    const pagerBefore = await this.nextPage.boundingBox();
    await this.page.evaluate(() => {
      window.__pagedListNoReload = true;
    });

    await this.nextPage.click();

    await expect(this.page).toHaveURL(/[?&]page=2(&|$)/);
    await expect.poll(() => this.rowTexts()).not.toEqual(before);
    expect(
      await this.page.evaluate(() => window.__pagedListNoReload),
      "paging must be a soft navigation, not a reload",
    ).toBe(true);
    const pagerAfter = await this.nextPage.boundingBox();
    expect(
      Math.abs((pagerAfter?.y ?? 0) - (pagerBefore?.y ?? 0)),
      "the pager must stay under the pointer",
    ).toBeLessThanOrEqual(1);

    return this.rowTexts();
  }

  /** Rows a fresh server render shows for the current URL. */
  async reloadRowTexts(): Promise<string[]> {
    await this.page.reload();
    await expect(this.rows.first()).toBeVisible();
    return this.rowTexts();
  }
}
