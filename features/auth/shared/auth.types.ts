export interface SessionData {
  username: string;
  accessToken: string;
  refreshToken: string;
  isLoggedIn: boolean;
}

export interface CookieOptions {
  name: string;
  encryptionKey: string;
  secure: boolean;
  httpOnly: boolean;
}