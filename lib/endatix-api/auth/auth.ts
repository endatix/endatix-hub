import { cache } from "react";
import { EndatixApi } from "../endatix-api";
import {
  ApiResult,
  ActivateInviteRequest,
  ActivateInviteResponse,
  AssumeTenantRequest,
  AssumeTenantResponse,
  SwitchTenantRequest,
  UserTenantsResponse,
  AuthorizationData,
  InviteDetailsRequest,
  InviteDetailsResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SendVerificationEmailRequest,
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

  async activateInvite(
    request: ActivateInviteRequest,
  ): Promise<ApiResult<ActivateInviteResponse>> {
    return this.endatix.post<ActivateInviteResponse>(
      "/auth/activate-invite",
      request,
      { requireAuth: false },
    );
  }

  async getInviteDetails(
    request: InviteDetailsRequest,
  ): Promise<ApiResult<InviteDetailsResponse>> {
    return this.endatix.post<InviteDetailsResponse>(
      "/auth/activate-invite/details",
      request,
      { requireAuth: false },
    );
  }

  async sendVerificationEmail(
    request: SendVerificationEmailRequest,
  ): Promise<ApiResult<string>> {
    return this.endatix.post<string>("/auth/send-verification-email", request, {
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

  async assumeTenant(
    request: AssumeTenantRequest,
  ): Promise<ApiResult<AssumeTenantResponse>> {
    return this.endatix.post<AssumeTenantResponse>(
      "/auth/assume-tenant",
      request,
      { requireAuth: true },
    );
  }

  async exitAssume(): Promise<ApiResult<AssumeTenantResponse>> {
    return this.endatix.post<AssumeTenantResponse>(
      "/auth/exit-assume",
      {},
      { requireAuth: true },
    );
  }

  async listMyTenants(): Promise<ApiResult<UserTenantsResponse>> {
    return this.endatix.get<UserTenantsResponse>("/auth/tenants", {
      requireAuth: true,
    });
  }

  async switchTenant(
    request: SwitchTenantRequest,
  ): Promise<ApiResult<AssumeTenantResponse>> {
    return this.endatix.post<AssumeTenantResponse>(
      "/auth/switch-tenant",
      request,
      { requireAuth: true },
    );
  }

  /**
   * Get authorization data for the current user
   * @returns The authorization data
   */
  async getAuthorizationData(): Promise<ApiResult<AuthorizationData>> {
    return this.endatix.get<AuthorizationData>("/auth/me", {
      requireAuth: true,
    });
  }
}
