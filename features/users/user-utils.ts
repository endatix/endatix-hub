import { CurrentUserInfo, Session } from "next-auth";

const UNKNOWN_INITIALS = "?";

/**
 * Extract 1-2 characters from any string.
 * Priority: First & Last initials > First two characters.
 */
function extractChars(input: string): string {
  const cleanInput = input.trim();
  if (!cleanInput) return "";

  // Split the input into parts by spaces
  const parts = cleanInput.split(/\s+/);

  if (parts.length >= 2) {
    const firstInitial = parts.at(0)!.charAt(0);
    const lastInitial = parts.at(-1)!.charAt(0);
    return (firstInitial + lastInitial).toUpperCase();
  }

  return cleanInput.slice(0, 2).toUpperCase();
}

/**
 * Derive a display name from a string: if it looks like an email (contains @),
 * use the local part with first letter capitalized; otherwise return trimmed as-is.
 * e.g. tech@endatix.com → Tech, John Doe → John Doe
 */
function toDisplayName(input?: string): string {
  const trimmed = input?.trim();
  if (!trimmed) return "";

  if (!trimmed.includes("@")) {
    return trimmed;
  }

  const local = trimmed.split("@")[0];
  if (!local) return "";

  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

/**
 * Display name: userName (or name derived from it if email-shaped), then email fallback.
 */
function getDisplayName(userName?: string, email?: string): string {
  const fromUserName = toDisplayName(userName);
  if (fromUserName) return fromUserName;

  const fromEmail = toDisplayName(email);
  if (fromEmail) return fromEmail;

  return "";
}

/**
 * Main function to get initials from user name or email.
 */
function getInitials(userName?: string, email?: string): string {
  if (userName?.trim()) {
    return extractChars(userName);
  }

  if (email?.trim()) {
    return extractChars(email);
  }

  return UNKNOWN_INITIALS;
}

/**
 * Get the current user info from the session.
 */
function getCurrentUserInfo(session: Session | null): CurrentUserInfo {
  const user = session?.user;
  if (!user) {
    return {
      isLoggedIn: false,
      name: "Not logged in",
      email: "",
      id: "",
      displayName: UNKNOWN_INITIALS,
      initials: UNKNOWN_INITIALS,
    };
  }

  return {
    isLoggedIn: true,
    name: user.name ?? "",
    email: user.email ?? "",
    id: user.id ?? "",
    displayName: getDisplayName(user.name, user.email),
    initials: getInitials(user.name, user.email),
  };
}
export { getDisplayName, getInitials, getCurrentUserInfo };
