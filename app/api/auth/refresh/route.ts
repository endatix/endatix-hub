import { unstable_update } from "@/auth";
import { EndatixJwtPayload } from "@/features/auth/infrastructure/jwt.types";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { decodeJwt } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { JWTInvalid } from "jose/errors";

export async function POST(request: NextRequest) {
  const { accessToken, refreshToken } = await request.json();

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Access token and refresh token are required" },
      { status: 400 },
    );
  }

  const endatix = new EndatixApi();
  const refreshTokenResult = await endatix.auth.refreshToken({
    refreshToken: refreshToken,
    accessToken: accessToken,
  });

  if (ApiResult.isSuccess(refreshTokenResult)) {
    try {
      const jwtPayload = decodeJwt<EndatixJwtPayload>(
        refreshTokenResult.data.accessToken,
      );

      const updatedSession = await unstable_update({
        accessToken: refreshTokenResult.data.accessToken,
        user: {
          accessToken: refreshTokenResult.data.accessToken,
          refreshToken: refreshTokenResult.data.refreshToken,
          expiresAt: jwtPayload.exp || Date.now() / 1000,
        },
      });

      return NextResponse.json(updatedSession);
      console.log("🥸 session updated");
    } catch (error: unknown) {
      if (error instanceof JWTInvalid) {
        return NextResponse.json(
          { error: "Invalid access token" },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: "Failed to decode access token" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Token expired" }, { status: 400 });
}
