import { getSession } from "@/features/auth";
import { deleteTheme, updateTheme } from "@/services/api";
import { NextResponse } from "next/server";
import { ITheme } from "survey-core";
// GET a specific theme by ID
// export async function GET(
//   request: Request,
//   { params }: { params: Promise<{ themeId: string }> }
// ) {
//   const session = await getSession();
//   if (!session.isLoggedIn) {
//     return Response.json({ error: 'Unauthorized' }, { status: 401 });
//   }

//   const { themeId } = await params;

//   try {
//     const theme = await themeRepository.getThemeById(themeId);
//     if (!theme) {
//       return NextResponse.json(
//         { error: 'Theme not found' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(theme);
//   } catch (error) {
//     console.error('Error retrieving theme:', error);
//     return NextResponse.json(
//       { error: 'Failed to retrieve theme' },
//       { status: 500 }
//     );
//   }
// }

// PUT to update a theme
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ themeId: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { themeId } = await params;

  try {
    const theme = (await request.json()) as ITheme;

    if (!theme || !theme.themeName) {
      return NextResponse.json(
        { error: "Invalid theme data" },
        { status: 400 },
      );
    }

    const updatedTheme = await updateTheme(themeId, theme);

    if (!updatedTheme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTheme);
  } catch (error) {
    console.error("Error updating theme:", error);
    return NextResponse.json(
      { error: "Failed to update theme" },
      { status: 500 },
    );
  }
}

// DELETE a theme
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ themeId: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { themeId } = await params;

  try {
    await deleteTheme(themeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting theme:", error);
    return NextResponse.json(
      { error: "Failed to delete theme" },
      { status: 500 },
    );
  }
}
