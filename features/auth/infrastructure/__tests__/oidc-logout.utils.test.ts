import { describe, expect, it } from "vitest";
import { SIGNIN_PATH } from "../auth-constants";
import {
  buildOidcEndSessionLogoutUrl,
  getPostLogoutRedirectUri,
} from "../oidc-logout.utils";

describe("oidc-logout.utils", () => {
  describe("buildOidcEndSessionLogoutUrl", () => {
    it("builds an encoded OIDC end-session URL", () => {
      // Arrange
      const endSessionEndpoint =
        "https://keycloak.endatix.test/realms/endatix/protocol/openid-connect/logout";
      const clientId = "endatix-hub";
      const idToken = "id.token.value";
      const postLogoutRedirectUri = "https://hub.endatix.test/signin";

      // Act
      const logoutUrl = new URL(
        buildOidcEndSessionLogoutUrl({
          endSessionEndpoint,
          clientId,
          idToken,
          postLogoutRedirectUri,
        }),
      );

      // Assert
      expect(logoutUrl.pathname).toBe(
        "/realms/endatix/protocol/openid-connect/logout",
      );
      expect(logoutUrl.searchParams.get("client_id")).toBe(clientId);
      expect(logoutUrl.searchParams.get("id_token_hint")).toBe(idToken);
      expect(logoutUrl.searchParams.get("post_logout_redirect_uri")).toBe(
        postLogoutRedirectUri,
      );
    });
  });

  describe("getPostLogoutRedirectUri", () => {
    it("builds the sign-in redirect URI from auth URL and base path", () => {
      // Act
      const redirectUri = getPostLogoutRedirectUri(
        "https://hub.endatix.test",
        SIGNIN_PATH,
        "/app",
      );

      // Assert
      expect(redirectUri).toBe("https://hub.endatix.test/app/signin");
    });
  });
});
