/**
 * Camera Patch Implementation
 *
 * This file contains the actual patching logic for the camera fix extension.
 * It's loaded lazily to optimize bundle size.
 */

import { QuestionFileModel } from "survey-core";

/**
 * Patches the SurveyJS Camera prototype to force environment-facing mode
 */
export function patchCameraPrototype(): void {
  try {
    // Create a filePatch dummy instance to access the Camera class
    const filePatch = new QuestionFileModel("filePatch");

    // @ts-expect-error - Accessing internal camera constructor
    const CameraClass = filePatch.camera?.constructor;

    if (!CameraClass?.prototype) {
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
  } catch (error) {
    console.error("[Endatix] Failed to patch Camera prototype:", error);
  }
}

patchCameraPrototype();
