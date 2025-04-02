import { NextResponse } from "next/server";
import { getSession } from "@/features/auth";
import { themeRepository } from "./repository";
import { ITheme } from "survey-core";

// GET all themes
export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Use repository to get all themes
    const themes = await themeRepository.getAllThemes();
    return NextResponse.json(themes);
  } catch (error) {
    console.error("Error fetching themes:", error);
    return NextResponse.json(
      { error: "Failed to retrieve themes" },
      { status: 500 }
    );
  }
}

// POST to create a new theme
export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const theme = await request.json() as ITheme;
    
    if (!theme || !theme.themeName) {
      return NextResponse.json(
        { error: "Invalid theme data" },
        { status: 400 }
      );
    }
    
    const newTheme = await themeRepository.createTheme(theme);
    return NextResponse.json(newTheme, { status: 201 });
  } catch (error) {
    console.error("Error creating theme:", error);
    return NextResponse.json(
      { error: "Failed to create theme" },
      { status: 500 }
    );
  }
}
