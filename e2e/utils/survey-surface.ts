import type { FrameLocator, Page } from "@playwright/test";
import { playgroundEmbedHostHref } from "./open-embed-host";

export const SURFACES = ["share", "iframe"] as const;

export type SurfaceKind = (typeof SURFACES)[number];
export type SurveySurface = Page | FrameLocator;

export const ALREADY_COMPLETED = "This form has already been completed.";

export function hubBaseUrl(): string {
  return process.env.BASE_URL ?? "http://localhost:3000";
}

export function embedHostOrigin(): string {
  return process.env.E2E_EMBED_HOST_URL ?? "http://localhost:5000";
}

/** Share page with a submission access token in the query string. */
export function shareAccessUrl(
  formId: string,
  token: string,
  query?: Record<string, string>,
): string {
  const url = new URL(`/share/${formId}`, hubBaseUrl());
  url.searchParams.set("token", token);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/** Personalized link page that redeems then redirects to `/share/{formId}`. */
export function personalLinkUrl(formId: string, token: string): string {
  return new URL(`/share/${formId}/a/${token}`, hubBaseUrl()).toString();
}

export function surfaceOf(
  page: Page,
  kind: SurfaceKind,
  formId: string,
): SurveySurface {
  return kind === "share"
    ? page
    : page.frameLocator(`iframe[id^="edxf-${formId}"]`);
}

export async function gotoSurface(
  page: Page,
  kind: SurfaceKind,
  formId: string,
  token: string,
  query?: Record<string, string>,
): Promise<SurveySurface> {
  if (kind === "share") {
    await page.goto(shareAccessUrl(formId, token, query));
  } else {
    await page.goto(
      playgroundEmbedHostHref(
        embedHostOrigin(),
        formId,
        hubBaseUrl(),
        token,
      ),
    );
  }
  return surfaceOf(page, kind, formId);
}

/** Opens share or the embed host and waits for SurveyJS. */
export async function openSurvey(
  page: Page,
  kind: SurfaceKind,
  formId: string,
  token: string,
  query?: Record<string, string>,
): Promise<SurveySurface> {
  const surface = await gotoSurface(page, kind, formId, token, query);
  await surface.locator(".sd-root-modern").waitFor({ timeout: 30_000 });
  return surface;
}

export function surveyRoot(surface: SurveySurface) {
  return surface.locator(".sd-root-modern");
}
