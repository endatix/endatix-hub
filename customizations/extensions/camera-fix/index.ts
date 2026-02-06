import type { ExtensionDefinition } from "@/lib/survey-extensions";

/**
 * Camera Fix Extension Definition
 *
 * This extension patches SurveyJS Camera prototype to force environment-facing camera.
 * The patch is applied globally at app initialization.
 */
export const cameraFixExtension: ExtensionDefinition = {
  id: "camera-facing-mode-fix",
  name: "Camera Facing Mode Fix",
  description: "Forces environment-facing camera for file upload questions",

  /**
   * This extension runs in both form and editor scopes
   * since the camera patch needs to be global
   */
  scopes: ["form", "editor"],

  /**
   * Server-side detection
   * Return true to always activate this extension (it's a global patch).
   */
  shouldActivate: () => true,

  /**
   * Dynamic loader to lazy load the implementation for smaller bundle size
   * The module is only fetched when the extension is activated (server-side detection via shouldActivate)
   */
  loader: () => import("./camera-patch").then((m) => m.default),
};

// Export as default for convenience
export default cameraFixExtension;
