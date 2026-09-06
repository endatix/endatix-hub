import { EndatixEmbedMessage } from "@/features/embed-form/types";
import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    __receivedEmbedMessages__: EndatixEmbedMessage[];
  }
}

test.describe("Embed Form Behavior (Real Environment)", () => {
  // Use an environment variable for the seeded form ID, or fallback to a known ID
  const TEST_FORM_ID = process.env.E2E_EMBED_FORM_ID || "0";

  test.beforeEach(async ({ page, baseURL }) => {
    // 1. Set up the message interceptor BEFORE the page navigates
    // addInitScript guarantees this runs before embed.js executes
    await page.addInitScript(() => {
      globalThis.window.__receivedEmbedMessages__ = [];
      globalThis.window.addEventListener("message", (event) => {
        if (event.data?.type?.startsWith("endatix:")) {
          globalThis.window.__receivedEmbedMessages__.push(event.data);
        }
      });
    });

    // 2. Mock a route on the SAME origin to act as our 3rd-party host site
    // This perfectly sidesteps the CORS and Private Network Access restrictions
    await page.route(`${baseURL}/__mock_host__`, async (route) => {
      await route.fulfill({
        contentType: "text/html",
        body: `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Test Host Page</title>
                  <style>
                    body { padding: 50px; background: #f0f0f0; font-family: sans-serif; }
                    .spacer { height: 1000px; } /* Force scrolling */
                  </style>
                </head>
                <body>
                  <h1>My External Website</h1>
                  <p>The form is embedded below:</p>
                  
                  <script 
                    src="${baseURL}/embed/v1/embed.js" 
                    data-form-id="${TEST_FORM_ID}">
                  </script>
                  
                  <div class="spacer"></div>
                </body>
              </html>
            `,
      });
    });

    // 3. Navigate to our mocked same-origin page
    await page.goto(`${baseURL}/__mock_host__`);
  });

  test("should load the form and send the form-loaded message", async ({
    page,
  }) => {
    // 1. Locate the iframe created by embed.js
    const frame = page.frameLocator(
      `iframe[id^="edxf-${TEST_FORM_ID}"]`,
    );

    // 2. Wait for the real SurveyJS component to render inside the iframe
    await expect(frame.locator(".sd-root-modern")).toBeVisible();

    // 3. Verify the parent window received the load event
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
    const frame = page.frameLocator(
      `iframe[id^="edxf-${TEST_FORM_ID}"]`,
    );
    await expect(frame.locator(".sd-root-modern")).toBeVisible();

    // Scroll down the parent page slightly to test the scroll-to-top behavior
    await page.evaluate(() => globalThis.window.scrollTo(0, 500));

    // Click Next to go to Page 2 - use more specific selector
    const nextButton = frame.locator(".sd-navigation__next-btn, input[value='Next']").first();
    await nextButton.click();

    // Verify the scroll message was sent to the parent
    // embed.js will catch this and execute scrollIntoView()
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
    const frame = page.frameLocator(
      `iframe[id^="edxf-${TEST_FORM_ID}"]`,
    );
    await expect(frame.locator(".sd-root-modern")).toBeVisible();

    // If your seeded form has multiple pages, navigate to the end
    const nextButton = frame.locator(".sd-navigation__next-btn, input[value='Next']").first();
    while (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }

    // Submit the form - use more specific selector
    const completeButton = frame.locator(".sd-navigation__complete-btn, input[value='Complete']").first();
    await completeButton.click();

    // The iframe intercepts the navigation, sends 'endatix:navigate',
    // and embed.js executes window.location.href = url.

    // Playwright waits for the top-level host page to navigate.
    // Adjust this regex to match the expected redirect URL of your seeded form
    await page.waitForURL(/endatix\.com/);

    expect(page.url()).toContain("endatix.com");
  });
});

test.describe("Embed Form Height Modes (Real Environment)", () => {
  const TEST_FORM_ID = process.env.E2E_EMBED_FORM_ID || "0";
  const CONTAINER_HEIGHT_PX = 900;

  test.beforeEach(async ({ page, baseURL }) => {
    // Mock a host page whose script sits inside a fixed-height container,
    // matching the customer scenario from endatix-hub#842.
    await page.route(`${baseURL}/__mock_host_fill__`, async (route) => {
      await route.fulfill({
        contentType: "text/html",
        body: `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Test Host Page (Fill Mode)</title>
                  <style>
                    body { padding: 50px; background: #f0f0f0; font-family: sans-serif; }
                  </style>
                </head>
                <body>
                  <h1>My External Website</h1>
                  <div style="height: ${CONTAINER_HEIGHT_PX}px; border: 1px solid #ccc;">
                    <script
                      src="${baseURL}/embed/v1/embed.js"
                      data-form-id="${TEST_FORM_ID}"
                      data-height-mode="fill">
                    </script>
                  </div>
                </body>
              </html>
            `,
      });
    });

    await page.goto(`${baseURL}/__mock_host_fill__`);
  });

  test("fills a fixed-height parent container when content is shorter", async ({
    page,
  }) => {
    const iframeLocator = page.locator(`iframe[id^="edxf-${TEST_FORM_ID}"]`);
    const frame = page.frameLocator(`iframe[id^="edxf-${TEST_FORM_ID}"]`);
    await expect(frame.locator(".sd-root-modern")).toBeVisible();

    // Confirm this test's own premise: if the seeded form's content isn't
    // actually shorter than the container, ">= container height" would
    // trivially pass in plain auto mode too and this test would prove
    // nothing about fill mode specifically.
    const contentHeight = await frame
      .locator(".sd-root-modern")
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(contentHeight).toBeLessThan(CONTAINER_HEIGHT_PX);

    // The browser resolves `min-height: 100%` against the 900px container natively;
    // give layout a moment to settle before measuring.
    await expect
      .poll(async () => {
        const box = await iframeLocator.boundingBox();
        return box?.height ?? 0;
      })
      .toBeGreaterThanOrEqual(CONTAINER_HEIGHT_PX - 5);

    // Upper bound too: proves the iframe settled at the container's height,
    // not merely "grew to at least" it for some unrelated reason.
    const finalHeight = (await iframeLocator.boundingBox())?.height ?? 0;
    expect(finalHeight).toBeLessThan(CONTAINER_HEIGHT_PX + 20);

    // The outer iframe box filling the container isn't enough on its own —
    // the document inside it must also paint that space, or the host page's
    // own background shows through below the (much shorter) survey content.
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

    // Poll, not a single read: the background is painted in a useEffect
    // that can run after .sd-root-modern first becomes visible, so a
    // one-shot check here would be flaky (still transparent) rather than
    // a reliable signal either way.
    await expect
      .poll(async () => {
        const colors = await readColors();
        return colors.body;
      })
      .not.toBe("rgba(0, 0, 0, 0)");

    const colors = await readColors();
    expect(colors.body).toBeTruthy();
    // Not just "some color" — it must match the survey's own rendered
    // theme, or this passes even with a hardcoded/wrong fallback color
    // (exactly how h930's SurveyJS-3.0 regression slipped through: this
    // assertion previously only checked for "not transparent"). Note this
    // only proves the fallback is unused for *this* seeded form, which has
    // no stored theme (DefaultLight throughout, no override to race
    // against) — see survey-component.test.tsx for coverage of a theme
    // arriving after the fallback has already painted.
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

    // Simulate navigating to a page tall enough to exceed the container —
    // same content-height change EmbedHeightReporter's MutationObserver
    // would see from a real multi-page form, without depending on the
    // seeded form having a page that happens to be this tall.
    await frameDocument?.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.id = "__e2e_grow_spacer__";
      spacer.style.height = "1600px";
      document.body.appendChild(spacer);
    });

    await expect
      .poll(async () => (await iframeLocator.boundingBox())?.height ?? 0)
      .toBeGreaterThan(CONTAINER_HEIGHT_PX + 100);

    // Simulate navigating back to a short page. This is the case #842's
    // own design goal (and this PR's CSS-only approach) explicitly targets:
    // the used height must track content again, not stay pinned at the
    // tallest height ever seen — the same ratchet problem the issue's own
    // proposed Math.max(content, container) implementation would have had.
    await frameDocument?.evaluate(() => {
      document.getElementById("__e2e_grow_spacer__")?.remove();
    });

    await expect
      .poll(async () => (await iframeLocator.boundingBox())?.height ?? 0)
      .toBeLessThan(CONTAINER_HEIGHT_PX + 20);
  });
});
