import { QuestionFileModel } from "survey-core";
import type { InitExtension } from "@/lib/survey-extensions";

/**
 * Camera Fix Extension
 *
 * Forces the environment-facing camera (back camera) for file upload questions.
 * This patches the SurveyJS Camera prototype to override the default camera selection.
 *
 * Use case: Mobile forms where users need to scan documents or capture objects.
 */
export const cameraFixExtension: InitExtension = {
  id: "camera-facing-mode-fix",
  name: "Camera Facing Mode Fix",
  type: "init",
  description: "Forces environment-facing camera for file upload questions",

  onInit: () => {
    try {
      // Access the internal Camera class through a dummy QuestionFileModel instance
      const dummyFile = new QuestionFileModel("dummy");
      // @ts-expect-error - Accessing internal camera constructor
      const CameraClass = dummyFile.camera?.constructor;

      if (CameraClass?.prototype) {
        const originalGetMediaConstraints =
          CameraClass.prototype.getMediaConstraints;

        const originalStartVideo = CameraClass.prototype.startVideo;
        CameraClass.prototype.startVideo = function (
          videoElement: HTMLVideoElement,
          callback: (stream: MediaStream) => void,
          imageWidth?: number,
          imageHeight?: number,
        ) {
          console.log("Starting video with environment-facing camera");
          return originalStartVideo.call(
            this,
            videoElement,
            callback,
            imageWidth,
            imageHeight,
          );
        };

        // Monkey-patch the getMediaConstraints method
        CameraClass.prototype.getMediaConstraints = function (
          deviceId: string,
        ) {
          const constraints = originalGetMediaConstraints.call(this, deviceId);

          // Ensure video constraints object exists
          if (!constraints.video) {
            constraints.video = {};
          }

          // Force environment-facing camera (back camera)
          constraints.video.facingMode = { ideal: "environment" };

          // Remove deviceId to allow facingMode to take precedence
          delete constraints.video.deviceId;

          return constraints;
        };

        console.log(
          "[Endatix] Camera prototype patched: Environment mode forced",
        );
      } else {
        console.warn("[Endatix] Camera class not found, skipping camera patch");
      }
    } catch (error) {
      console.error("[Endatix] Failed to patch Camera prototype:", error);
    }
  },
};
