import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import { appendEndatixImageRemotePatterns } from "../../lib/hosting/next-config-helper";
import {
  logExperimentalStatus,
} from "./experimental-config";
import {
  resolveEndatixSettings,
  type WithEndatixOptions,
} from "./resolve-endatix-settings";

export type {
  EndatixConfig,
  EndatixResolvedSettings,
  ResolveEndatixSettingsSource,
  StorageProfileSlice,
  StorageProviderEnvChoice,
  WithEndatixOptions,
} from "./resolve-endatix-settings";
export { getRuntimeStorageProfile, resolveEndatixSettings } from "./resolve-endatix-settings";

/**
 * @param {import('next').NextConfig} nextConfig
 * @param {WithEndatixOptions} [options] - Optional overrides; env is the default (see resolveEndatixSettings).
 * @returns {import('next').NextConfig}
 */
export const withEndatix = (
  nextConfig: NextConfig = {},
  options: WithEndatixOptions = {},
) => {
  const resolved = resolveEndatixSettings({
    options,
    source: "withEndatix",
  });

  logExperimentalStatus(resolved.mergedExperimentalConfig);

  const remotePatterns: (URL | RemotePattern)[] = [
    ...(nextConfig.images?.remotePatterns ?? []),
  ];
  appendEndatixImageRemotePatterns(
    remotePatterns,
    resolved.storage.imageRemoteHostnames,
  );

  const env = {
    ...nextConfig.env,
    ...resolved.envPatch,
  };

  return {
    ...nextConfig,
    env,
    images: {
      ...nextConfig.images,
      remotePatterns,
    },
  };
};

export default withEndatix;
