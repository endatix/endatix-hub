import "server-only";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import type { RequiredActionError } from "@/lib/endatix-api/auth/required-action";
import { normalizeBasePath } from "@/lib/hosting/base-path";
import { resolveTarget } from "@/lib/routes/resolve-target";
import { HUB_PATHS } from "../infrastructure/auth-constants";

/** Route handlers keep their API result; a browser action on a workspace page navigates. */
export async function handleActionRefusal(refusal: RequiredActionError) {
  const pathname = await actionPage();
  if (!pathname) return;
  const target = resolveTarget(refusal.actions, pathname);
  if (target) redirect(target);
}

async function actionPage() {
  try {
    const request = await headers();
    if (!request.has("next-action")) return null;
    const page = new URL(request.get("referer") ?? "");
    if (page.origin !== request.get("origin")) return null;
    const base = normalizeBasePath();
    if (!page.pathname.startsWith(`${base}/`)) return null;
    const path = page.pathname.slice(base.length);
    return HUB_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
      ? path
      : null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}
