import type { ContainerType } from "../../types";

export interface ClientImageConfig {
  isResizeEnabled: boolean;
  defaultResizeWidth: number;
}

/** Client-safe storage config for browser URL parsing and display. */
export interface ClientStorageConfig {
  isEnabled: boolean;
  isPrivate: boolean;
  hostName: string;
  protocol: "https" | "http";
  containerNames: Record<ContainerType, string>;
  imageConfig: ClientImageConfig;
}
