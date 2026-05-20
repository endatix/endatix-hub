import type { ImageConfig } from "../../image-service";
import type { ContainerType } from "../../../types";

/** Client-safe storage config (browser URL parsing, prefetch). */
export interface ClientStorageConfig {
  isEnabled: boolean;
  isPrivate: boolean;
  hostName: string;
  protocol: "https" | "http";
  containerNames: Record<ContainerType, string>;
  imageConfig: ImageConfig;
}

/** Builds a client storage config. */
export function buildClientStorageConfig(input: {
  isEnabled: boolean;
  isPrivate: boolean;
  hostName: string;
  protocol: "https" | "http";
  containerNames: Record<ContainerType, string>;
  imageConfig: ImageConfig;
}): ClientStorageConfig {
  return Object.freeze({
    isEnabled: input.isEnabled,
    isPrivate: input.isPrivate,
    hostName: input.hostName,
    protocol: input.protocol,
    containerNames: input.containerNames,
    imageConfig: input.imageConfig,
  });
}
