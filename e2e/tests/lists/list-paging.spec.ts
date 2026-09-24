import { expect, test } from "@playwright/test";
import { SignInPage } from "../../pages/auth/sign-in.page";
import { PagedListPage } from "../../pages/lists/paged-list.page";

/**
 * Regression net for endatix-hub#1011: footer paging updated the URL but the
 * grid kept the first page until a reload. Each list is paged the way a user
 * does it, then compared with a fresh server render of the same URL — that
 * oracle catches a latched grid *and* latched cells (index-keyed rows).
 *
 * Needs a signed-in user with at least 2 rows per list (`pageSize=1` makes
 * that cheap), and `E2E_PAGING_FORM_ID` with more than 10 submissions.
 * Admin lists need a platform admin.
 */
const email = process.env.E2E_EMAIL ?? process.env.SMOKE_TEST_EMAIL;
const password = process.env.E2E_PASSWORD ?? process.env.SMOKE_TEST_PASSWORD;
const pagingFormId = process.env.E2E_PAGING_FORM_ID;

const TABLE_ROWS = "main table tbody tr";

const lists = [
  {
    name: "forms",
    url: "/forms?browse=all&pageSize=1",
    rows: ".grid-card-list > *",
  },
  { name: "data lists", url: "/data-lists?pageSize=1", rows: TABLE_ROWS },
  {
    name: "users",
    url: "/settings/organization/users?pageSize=1",
    rows: TABLE_ROWS,
  },
  {
    name: "roles",
    url: "/settings/organization/roles?pageSize=1",
    rows: TABLE_ROWS,
  },
  { name: "tenants", url: "/admin/tenants?pageSize=1", rows: TABLE_ROWS },
  {
    name: "platform admins",
    url: "/admin/platform-admins?pageSize=1",
    rows: TABLE_ROWS,
  },
  {
    name: "submissions",
    url: pagingFormId ? `/forms/${pagingFormId}/submissions?pageSize=10` : "",
    rows: TABLE_ROWS,
  },
];

test.describe("Paged lists", () => {
  test.skip(!email || !password, "Set E2E_EMAIL / E2E_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await new SignInPage(page).performSignInFlow(email!, password!);
  });

  for (const list of lists) {
    test(`${list.name}: next page shows that page's rows without a reload`, async ({
      page,
    }) => {
      test.skip(!list.url, "Set E2E_PAGING_FORM_ID");
      const pagedList = new PagedListPage(page, list.rows);

      // Arrange
      await pagedList.open(list.url);
      test.skip(
        await pagedList.nextPage.isDisabled(),
        `${list.name}: seed at least 2 pages of rows`,
      );

      // Act
      const pagedRows = await pagedList.goToNextPage();

      // Assert
      expect(pagedRows).toEqual(await pagedList.reloadRowTexts());
    });
  }

  test("users: typing a search keeps focus while the grid reloads", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/settings/organization/users");
    const search = page.getByLabel(
      "Search organization users by name or email",
    );

    // Act
    await search.pressSequentially("zz-no-match", { delay: 120 });
    await expect(page).toHaveURL(/search=zz-no-match/);

    // Assert
    await expect(search).toBeFocused();
    await expect(search).toHaveValue("zz-no-match");
  });
});
