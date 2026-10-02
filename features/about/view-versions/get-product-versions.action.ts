"use server";

import { auth } from "@/auth";
import { getHubBuild } from "@/lib/hosting/hub-version";
import type { ProductVersions } from "../types";
import { readApiBuild } from "./read-api-version.server";

/** Hub and API builds for the signed-in user. Read on demand, never rendered into a page. */
export async function getProductVersionsAction(): Promise<ProductVersions> {
  const session = await auth();
  if (!session?.accessToken) {
    return { hub: null, api: null };
  }

  return {
    hub: getHubBuild(),
    api: await readApiBuild(session.accessToken),
  };
}
