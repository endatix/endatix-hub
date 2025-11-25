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

export enum AuthErrorType {
  Configuration = "Configuration",
  Network = "Network",
  Server = "Server",
  InvalidToken = "InvalidToken",
  Unknown = "Unknown",
}

export interface ErrorDetails {
  message: string;
  code: string;
}
