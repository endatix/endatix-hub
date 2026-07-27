export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side counterpart to instrumentation-client.ts: survey components
    // are client components, but Next still renders them on the server, so the
    // sanitizer has to be installed in both runtimes.
    await import("@/lib/survey-features/safe-html");
    await import("@/lib/hosting/check-node-version");
    await import("@/lib/hosting/check-environment");
    await import("@/instrumentation.node");
  }
}
