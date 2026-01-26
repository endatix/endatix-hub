import {
  AssetStorageContext,
  enrichImageInJSX,
} from "@/features/asset-storage/client";
import React from "react";
import {
  ReactQuestionFactory,
  SurveyQuestionSignaturePad,
} from "survey-react-ui";

let isRegistered = false;

/**
 * A custom signature pad wrapper component that renders the signature pad with a protected background image.
 * It will only render the signature pad if the storage is enabled and private.
 * To be used within the Survey Creator only.
 */
class ProtectedSignaturePad extends SurveyQuestionSignaturePad {
  declare context: React.ContextType<typeof AssetStorageContext>;
  renderBackgroundImage(): React.JSX.Element | null {
    if (!this.question.backgroundImage) {
      return null;
    }

    const ctx = this.context;
    const isPrivatedStorageEnabled =
      ctx?.config?.isEnabled && ctx.config.isPrivate && ctx.resolveStorageUrl;

    const baseImage = super.renderBackgroundImage();
    if (!isPrivatedStorageEnabled || !baseImage) {
      return baseImage;
    }

    return enrichImageInJSX(baseImage, ctx.resolveStorageUrl);
  }
}

function registerProtectedSignaturePad() {
  if (globalThis.window === undefined || isRegistered) return;

  ReactQuestionFactory.Instance.registerQuestion("signaturepad", (props) => {
    return React.createElement(ProtectedSignaturePad, props);
  });
  ProtectedSignaturePad.contextType = AssetStorageContext;

  isRegistered = true;
}

export { ProtectedSignaturePad, registerProtectedSignaturePad };
