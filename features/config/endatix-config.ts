import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import {
  appendEndatixImageRemotePatterns,
  mergeEndatixImageLocalPatterns,
} from "../../lib/hosting/next-config-helper";
import {
  resolveEndatixSettings,
  type WithEndatixOptions,
} from "./resolve-endatix-settings";

export type {
  ClientEndatixConfig,
  EndatixConfig,
  EndatixResolvedSettings,
  ResolveEndatixSettingsSource,
  StorageProfileSlice,
  StorageProvider,
  WithEndatixOptions,
} from "./resolve-endatix-settings";
export {
  getClientEndatixConfig,
  getRuntimeStorageProfile,
  resolveEndatixSettings,
} from "./resolve-endatix-settings";

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
      localPatterns: mergeEndatixImageLocalPatterns(
        nextConfig.images?.localPatterns,
      ),
    },
  };
};

export default withEndatix;
