/**
 * Camera Patch Logic
 *
 * Separated into its own module for lazy loading.
 * This code only executes when the extension is actually loaded.
 */

import { QuestionFileModel } from "survey-core";

/**
 * Patches the SurveyJS Camera prototype to force environment-facing camera
 */
export function patchCameraPrototype() {
  try {
    // Access the internal Camera class through a dummy QuestionFileModel instance
    const dummyFile = new QuestionFileModel("dummy");
    // @ts-expect-error - Accessing internal camera constructor
    const CameraClass = dummyFile.camera?.constructor;

    if (!CameraClass?.prototype) {
      console.warn("[Endatix] Camera class not found, skipping camera patch");
      return false;
    }

    const originalGetMediaConstraints =
      CameraClass.prototype.getMediaConstraints;

    // Monkey-patch the getMediaConstraints method
    CameraClass.prototype.getMediaConstraints = function (deviceId: string) {
      const constraints = originalGetMediaConstraints.call(this, deviceId);

      // Ensure video constraints object exists
      if (!constraints.video) {
        constraints.video = {};
      }

      constraints.video.facingMode = { ideal: "environment" };

      delete constraints.video.deviceId;

      return constraints;
    };

    console.log("[Endatix] Camera prototype patched: Environment mode forced");
    return true;
  } catch (error) {
    console.error("[Endatix] Failed to patch Camera prototype:", error);
    return false;
  }
}
