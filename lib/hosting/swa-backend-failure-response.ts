import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const SWA_BACKEND_FAILURE_PAGE = "public/swa-backend-failure.html";

export async function swaBackendFailureResponse(
  status = 502,
): Promise<NextResponse> {
  const html = await readFile(
    path.join(process.cwd(), SWA_BACKEND_FAILURE_PAGE),
    "utf8",
  );

  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
