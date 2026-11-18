import { cache } from "react";
import { redirect, RedirectType } from "next/navigation";
import { SessionData } from "./auth.types";
import { auth } from "@/auth";

export const ANONYMOUS_SESSION: SessionData = {
  username: "",
  accessToken: "",
  refreshToken: "",
  isLoggedIn: false,
};

// Cached session getter for reuse
export const getSession = cache(async (): Promise<SessionData> => {
  const authService = new AuthService();
  const session = await authService.getSession();
  return session;
});

// Authentication guard for protected routes
export const ensureAuthenticated = async (): Promise<void> => {
  const currentSession = await getSession();
  if (!currentSession.isLoggedIn) {
    redirect("/login", RedirectType.push);
  }
};

export class AuthService {
  async getSession(): Promise<SessionData> {
    const session = await auth();
    if (!session?.user) {
      return ANONYMOUS_SESSION;
    }

    return {
      isLoggedIn: true,
      username: session.user.name ?? session.user.email ?? "",
      accessToken: session.accessToken ?? "",
      refreshToken: session.refreshToken ?? "", // this is no longer needed as we can handle it on jwt callback
    };
  }
}
