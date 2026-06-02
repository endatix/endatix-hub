import { JWT } from "next-auth/jwt";
import { Account, User } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEYCLOAK_ID, KeycloakAuthProvider } from "../keycloak-auth-provider";

describe("KeycloakAuthProvider", () => {
  const provider = new KeycloakAuthProvider();
  const postLogoutRedirectUri = "https://hub.endatix.test/signin";

  beforeEach(() => {
    process.env.AUTH_KEYCLOAK_ISSUER =
      "https://keycloak.endatix.test/realms/endatix";
    process.env.AUTH_KEYCLOAK_CLIENT_ID = "endatix-hub";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AUTH_KEYCLOAK_ISSUER;
    delete process.env.AUTH_KEYCLOAK_CLIENT_ID;
  });

  describe("handleJWT", () => {
    it("stores the Keycloak id_token for federated logout", async () => {
      // Arrange
      const user = {
        id: "user-1",
        email: "user@endatix.test",
        name: "Endatix User",
      } as User;
      const account = {
        provider: KEYCLOAK_ID,
        providerAccountId: "keycloak-user-1",
        access_token: "access-token",
        refresh_token: "refresh-token",
        id_token: "id-token",
        expires_at: 1_800_000_000,
      } as Account;

      // Act
      const token = await provider.handleJWT({
        token: {},
        user,
        account,
      });

      // Assert
      expect(token.provider).toBe(KEYCLOAK_ID);
      expect(token.id_token).toBe(account.id_token);
      expect(token.access_token).toBe(account.access_token);
      expect(token.refresh_token).toBe(account.refresh_token);
      expect(token.expires_at).toBe(account.expires_at);
    });
  });

  describe("resolveFederatedLogoutUrl", () => {
    it("builds a Keycloak end-session URL when id_token is present", () => {
      // Arrange
      const token = {
        id_token: "id-token",
      } as JWT;

      // Act
      const logoutUrl = new URL(
        provider.resolveFederatedLogoutUrl({
          token,
          postLogoutRedirectUri,
        }) ?? "",
      );

      // Assert
      expect(logoutUrl.pathname).toBe(
        "/realms/endatix/protocol/openid-connect/logout",
      );
      expect(logoutUrl.searchParams.get("client_id")).toBe("endatix-hub");
      expect(logoutUrl.searchParams.get("id_token_hint")).toBe("id-token");
      expect(logoutUrl.searchParams.get("post_logout_redirect_uri")).toBe(
        postLogoutRedirectUri,
      );
    });

    it("returns null when the session has no id_token", () => {
      // Act
      const logoutUrl = provider.resolveFederatedLogoutUrl({
        token: {} as JWT,
        postLogoutRedirectUri,
      });

      // Assert
      expect(logoutUrl).toBeNull();
    });

    it("returns null when the issuer is not a valid URL", () => {
      // Arrange
      process.env.AUTH_KEYCLOAK_ISSUER = "not-a-valid-url";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Act
      const logoutUrl = provider.resolveFederatedLogoutUrl({
        token: { id_token: "id-token" } as JWT,
        postLogoutRedirectUri,
      });

      // Assert
      expect(logoutUrl).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        "Keycloak logout requested but AUTH_KEYCLOAK_ISSUER is not a valid URL",
      );
    });
  });
});
