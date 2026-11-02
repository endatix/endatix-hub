"use server";

import { auth } from "@/auth";
import { getHubBuild, getSurveyJsVersions } from "@/lib/hosting/hub-version";
import type { ProductVersions } from "../types";
import { readApiBuild } from "./read-api-version.server";
import { authorization } from "@/features/auth";

/** Hub, API and SurveyJS versions for the signed-in user. Read on demand, never rendered into a page. */
export async function getProductVersionsAction(): Promise<ProductVersions> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  if (!session?.accessToken) {
    return { hub: null, api: null, surveyJs: null };
  }

  return {
    hub: getHubBuild(),
    api: await readApiBuild(session.accessToken),
    surveyJs: getSurveyJsVersions(),
  };
}
