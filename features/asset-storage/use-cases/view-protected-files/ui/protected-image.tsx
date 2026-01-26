/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AssetStorageContext,
  enrichImageInJSX,
} from "@/features/asset-storage/client";
import * as React from "react";
import { ReactQuestionFactory, SurveyQuestionImage } from "survey-react-ui";

let isRegistered = false;

class ProtectedQuestionImage extends SurveyQuestionImage {
  declare context: React.ContextType<typeof AssetStorageContext>;

  protected renderElement(): React.JSX.Element {
    const ctx = this.context;
    const imageLink = this.question.locImageLink.renderedHtml;

    const isPrivatedStorageEnabled =
      ctx?.config?.isEnabled && ctx.config.isPrivate && ctx.resolveStorageUrl;
    if (!isPrivatedStorageEnabled || !imageLink) {
      return super.renderElement();
    }

    const baseElement = super.renderElement();
    return enrichImageInJSX(baseElement, ctx.resolveStorageUrl);
  }
}

function registerProtectedImages() {
  if (globalThis.window === undefined || isRegistered) return;

  ReactQuestionFactory.Instance.registerQuestion("image", (props: any) => {
    return React.createElement(ProtectedQuestionImage, props);
  });

  ProtectedQuestionImage.contextType = AssetStorageContext;

  isRegistered = true;
}

export { ProtectedQuestionImage, registerProtectedImages };
