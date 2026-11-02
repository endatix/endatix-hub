import { withBasePath } from "@/lib/hosting";

/** The share page path a test link opens: the token is its only credential. */
export const testLinkPath = (formId: string, token: string) =>
  withBasePath(`/share/${formId}?${new URLSearchParams({ token })}`);
