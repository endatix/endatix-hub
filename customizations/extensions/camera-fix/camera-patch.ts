/**
 * Camera Patch Implementation
 *
 * This file contains the actual patching logic for the camera fix extension.
 * It's loaded lazily to optimize bundle size.
 */

import { QuestionFileModel } from "survey-core";
import type { ExtensionImplementation } from "@/lib/survey-extensions";

/**
 * Patches the SurveyJS Camera prototype to force environment-facing mode
 */
export function patchCameraPrototype(): void {
  try {
    // Create a dummy instance to access the Camera class
    const dummyFile = new QuestionFileModel("dummy");

    // @ts-expect-error - Accessing internal camera constructor
    const CameraClass = dummyFile.camera?.constructor;

    if (!CameraClass || !CameraClass.prototype) {
      console.warn("[Endatix] Camera class not found, cannot apply patch");
      return;
    }

    const originalConstraints = CameraClass.prototype.getMediaConstraints;

    if (!originalConstraints) {
      console.warn(
        "[Endatix] getMediaConstraints not found on Camera prototype",
      );
      return;
    }

    // Monkey-patch the method
    CameraClass.prototype.getMediaConstraints = function (deviceId: string) {
      const constraints = originalConstraints.call(this, deviceId);

      if (!constraints.video) {
        constraints.video = {};
      }

      // Force environment-facing camera (back camera)
      constraints.video.facingMode = { ideal: "environment" };

      // Remove device ID to let the browser choose the best environment camera
      delete constraints.video.deviceId;

      return constraints;
    };

    console.log("[Endatix] Camera prototype patched: Environment mode forced");
  } catch (error) {
    console.error("[Endatix] Failed to patch Camera prototype:", error);
  }
}

/**
 * Extension implementation
 *
 * This is what gets loaded by the loader() function.
 * It exports the implementation with lifecycle hooks.
 */
const implementation: ExtensionImplementation = {
  onInit: () => {
    patchCameraPrototype();
  },
};

export default implementation;
