export interface SessionData {
  username: string;
  accessToken: string;
  refreshToken: string;
  isLoggedIn: boolean;
}

export enum AuthErrorType {
  Configuration = "Configuration",
  Network = "Network",
  Server = "Server",
  InvalidToken = "InvalidToken",
  Unknown = "Unknown",
}
