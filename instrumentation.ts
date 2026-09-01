export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Before anything reads config: normalise the deprecated NEXT_PUBLIC_-prefixed
    // names into their ENDATIX_ equivalents, so server-rendered client components see
    // the same values the browser will get from the hydrated projection.
    //
    // Node-only, and that is sufficient *because this app has no edge runtime*: `proxy.ts`
    // compiles to `runtime: "nodejs"` (the Next 16 default) and no route opts into edge.
    // `no-edge-runtime.test.ts` fails if that stops being true. Do not "fix" this by
    // importing the shim in an edge branch — Next inlines NEXT_PUBLIC_-prefixed literals
    // into the edge bundle at build time, which would fold build-time values instead of
    // runtime ones. An edge runtime would need the values passed in, not normalised.
    const { applyLegacyPublicEnv } =
      await import("@/features/config/legacy-public-env.server");
    applyLegacyPublicEnv();

    // Server-side counterpart to instrumentation-client.ts: survey components
    // are client components, but Next still renders them on the server, so the
    // sanitizer has to be installed in both runtimes.
    await import("@/lib/survey-features/safe-html");
    await import("@/lib/hosting/check-node-version");
    await import("@/lib/hosting/check-environment");
    await import("@/instrumentation.node");
  }
}
