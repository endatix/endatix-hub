import { EndatixEmbedMessage } from "@/features/embed-form/types";
import { expect, test } from "@playwright/test";
import {
  EMBED_FILL_CONTAINER_HEIGHT_PX,
  openEmbedHost,
} from "../../utils/open-embed-host";

declare global {
  interface Window {
    __receivedEmbedMessages__: EndatixEmbedMessage[];
  }
}

test.describe("Embed Form Behavior (Real Environment)", () => {
  const TEST_FORM_ID = process.env.E2E_EMBED_FORM_ID || "0";

  test.beforeEach(async ({ page, baseURL }) => {
    await page.addInitScript(() => {
      globalThis.window.__receivedEmbedMessages__ = [];
      globalThis.window.addEventListener("message", (event) => {
        if (event.data?.type?.startsWith("endatix:")) {
          globalThis.window.__receivedEmbedMessages__.push(event.data);
        }
      });
    });

    await openEmbedHost(page, { baseURL, formId: TEST_FORM_ID });
  });

  test("should load the form and send the form-loaded message", async ({
    page,
  }) => {
    const frame = page.frameLocator(`iframe[id^="edxf-${TEST_FORM_ID}"]`);

    await expect(frame.locator(".sd-root-modern")).toBeVisible();

    const messages = await page.evaluate(
      () => globalThis.window.__receivedEmbedMessages__,
    );
    expect(messages).toContainEqual(
      expect.objectContaining({
        type: "endatix:form-loaded",
        formId: TEST_FORM_ID,
      }),
    );
  });

  test("should trigger scroll message when navigating pages", async ({
    page,
  }) => {
    const frame = page.frameLocator(`iframe[id^="edxf-${TEST_FORM_ID}"]`);
    await expect(frame.locator(".sd-root-modern")).toBeVisible();

    await page.evaluate(() => globalThis.window.scrollTo(0, 500));

    const nextButton = frame
      .locator(".sd-navigation__next-btn, input[value='Next']")
      .first();
    await nextButton.click();

    await expect
      .poll(async () => {
        const messages = await page.evaluate(
          () => globalThis.window.__receivedEmbedMessages__,
        );
        return messages.some(
          (m: EndatixEmbedMessage) => m.type === "endatix:scroll",
        );
      })
      .toBeTruthy();
  });

  test("should delegate navigation to the parent window on completion", async ({
    page,
  }) => {
    const frame = page.frameLocator(`iframe[id^="edxf-${TEST_FORM_ID}"]`);
    await expect(frame.locator(".sd-root-modern")).toBeVisible();

    const nextButton = frame
      .locator(".sd-navigation__next-btn, input[value='Next']")
      .first();
    while (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }

    const completeButton = frame
      .locator(".sd-navigation__complete-btn, input[value='Complete']")
      .first();
    await completeButton.click();

    await page.waitForURL(/endatix\.com/);

    expect(page.url()).toContain("endatix.com");
  });
});

test.describe("Embed Form Height Modes (Real Environment)", () => {
  const TEST_FORM_ID = process.env.E2E_EMBED_FORM_ID || "0";
  const CONTAINER_HEIGHT_PX = EMBED_FILL_CONTAINER_HEIGHT_PX;

  test.beforeEach(async ({ page, baseURL }) => {
    await openEmbedHost(page, {
      baseURL,
      formId: TEST_FORM_ID,
      heightMode: "fill",
      containerHeightPx: CONTAINER_HEIGHT_PX,
    });
  });

  test("fills a fixed-height parent container when content is shorter", async ({
    page,
  }) => {
    const iframeLocator = page.locator(`iframe[id^="edxf-${TEST_FORM_ID}"]`);
    const frame = page.frameLocator(`iframe[id^="edxf-${TEST_FORM_ID}"]`);
    await expect(frame.locator(".sd-root-modern")).toBeVisible();

    const contentHeight = await frame
      .locator(".sd-root-modern")
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(contentHeight).toBeLessThan(CONTAINER_HEIGHT_PX);

    await expect
      .poll(async () => {
        const box = await iframeLocator.boundingBox();
        return box?.height ?? 0;
      })
      .toBeGreaterThanOrEqual(CONTAINER_HEIGHT_PX - 5);

    const finalHeight = (await iframeLocator.boundingBox())?.height ?? 0;
    expect(finalHeight).toBeLessThan(CONTAINER_HEIGHT_PX + 20);

    const frameElement = await iframeLocator.elementHandle();
    const frameDocument = await frameElement?.contentFrame();
    const readColors = () =>
      frameDocument!.evaluate(() => {
        const card = document.querySelector(".sd-root-modern");
        return {
          body: getComputedStyle(document.body).backgroundColor,
          cardSurface: card
            ? getComputedStyle(card, "::before").backgroundColor
            : null,
        };
      });

    await expect
      .poll(async () => {
        const colors = await readColors();
        const cardSurfacePainted =
          Boolean(colors.cardSurface) &&
          colors.cardSurface !== "rgba(0, 0, 0, 0)";
        return cardSurfacePainted && colors.cardSurface === colors.body;
      })
      .toBe(true);

    const colors = await readColors();
    expect(colors.body).toBeTruthy();
    expect(colors.cardSurface).toBeTruthy();
    expect(colors.body).toBe(colors.cardSurface);
  });

  test("grows past the container when content is taller, and shrinks back down when content shrinks again", async ({
    page,
  }) => {
    const iframeLocator = page.locator(`iframe[id^="edxf-${TEST_FORM_ID}"]`);
    const frame = page.frameLocator(`iframe[id^="edxf-${TEST_FORM_ID}"]`);
    await expect(frame.locator(".sd-root-modern")).toBeVisible();

    const frameElement = await iframeLocator.elementHandle();
    const frameDocument = await frameElement?.contentFrame();

    await frameDocument?.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.id = "__e2e_grow_spacer__";
      spacer.style.height = "1600px";
      document.body.appendChild(spacer);
    });

    await expect
      .poll(async () => (await iframeLocator.boundingBox())?.height ?? 0)
      .toBeGreaterThan(CONTAINER_HEIGHT_PX + 100);

    await frameDocument?.evaluate(() => {
      document.getElementById("__e2e_grow_spacer__")?.remove();
    });

    await expect
      .poll(async () => (await iframeLocator.boundingBox())?.height ?? 0)
      .toBeLessThan(CONTAINER_HEIGHT_PX + 20);
  });
});
