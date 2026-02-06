/**
 * Camera Fix Extension
 *
 * Forces the environment-facing camera (back camera) for file upload questions.
 * Useful for mobile forms where users need to scan documents or capture objects
 * with their device's back camera by default.
 */

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

  detect: () => true,

  loader: () => import("@/customizations/extensions/camera-fix/camera-patch"),

  hooks: {
    onInit: async () => {
      const { patchCameraPrototype } =
        await import("@/customizations/extensions/camera-fix/camera-patch");
      patchCameraPrototype();
    },
  },
};

// Export as default for convenience
export default cameraFixExtension;
