import { NextResponse } from "next/server";
import {
  rentalThemeLight,
  rentalThemeDark,
} from "./rental-theme";
import {
  conferenceThemeLight,
  conferenceThemeDark,
} from "./conference-theme";

import { getSession } from "@/features/auth";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // TODO: Fetch themes from database
  return NextResponse.json([
    rentalThemeLight,
    rentalThemeDark,
    conferenceThemeLight,
    conferenceThemeDark
  ]);
}
