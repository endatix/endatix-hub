import { cache } from "react";
import { EndatixApi } from "../endatix-api";
import {
  ApiResult,
  AuthorizationData,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SignInRequest,
  SignInResponse,
} from "../types";

export default class Auth {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Sign in
   * @param request - The request containing the email and password
   * @returns The response containing the access token and refresh token
   */
  async signIn(request: SignInRequest): Promise<ApiResult<SignInResponse>> {
    return this.endatix.post<SignInResponse>("/auth/login", request, {
      requireAuth: false,
    });
  }

  refreshToken = cache(
    async (
      request: RefreshTokenRequest,
    ): Promise<ApiResult<RefreshTokenResponse>> => {
      return this.endatix.post<RefreshTokenResponse>(
        "/auth/refresh-token",
        request,
        {
          requireAuth: false,
          headers: {
            Authorization: `Bearer ${request.accessToken}`,
          },
        },
      );
    },
  );

  /**
   * Get authorization data
   * @returns The authorization data
   */
  async getAuthorizationData(): Promise<ApiResult<AuthorizationData>> {
    return this.endatix.get<AuthorizationData>("/auth/me", {
      requireAuth: true,
    });
  }
}
