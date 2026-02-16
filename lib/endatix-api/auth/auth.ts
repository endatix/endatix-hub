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
import { FormAccessData } from "./types";

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
   * Get authorization data for the current user
   * @returns The authorization data
   */
  async getAuthorizationData(): Promise<ApiResult<AuthorizationData>> {
    return this.endatix.get<AuthorizationData>("/auth/me", {
      requireAuth: true,
    });
  }

  /**
   * Get form access permissions
   * @param formId - The form ID
   * @param submissionId - Optional submission ID
   * @param token - Optional access token
   * @returns The form access data with permissions
   */
  async getFormAccess(
    formId: string,
    submissionId?: string,
    token?: string,
  ): Promise<ApiResult<FormAccessData>> {
    const params = new URLSearchParams({ formId });
    if (submissionId) params.append("submissionId", submissionId);
    if (token) params.append("token", token);

    return this.endatix.get<FormAccessData>(`/auth/access/form?${params}`, {
      requireAuth: true,
    });
  }
}
