import { brandRouteResponse } from "@/lib/branding/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return brandRouteResponse((await params).path, request);
}
