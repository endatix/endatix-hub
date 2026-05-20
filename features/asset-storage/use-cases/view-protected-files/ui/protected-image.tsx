"use client";

import { AssetStorageContext } from "@/features/asset-storage/ui/asset-storage.context";
import * as React from "react";
import { QuestionImageModel } from "survey-core";
import {
  ReactQuestionFactory,
  SurveyQuestionImage,
  SvgIcon,
} from "survey-react-ui";
import {
  isPrivateStorageContext,
  StoragePresignedImage,
  toCssObjectFit,
} from "./protected-storage-media";

let isRegistered = false;

/**
 * Image question with private storage: SurveyJS structure with presigned GET via StoragePresignedImage.
 */
class ProtectedQuestionImage extends SurveyQuestionImage {
  declare context: React.ContextType<typeof AssetStorageContext>;

  protected get question(): QuestionImageModel {
    return this.questionBase as QuestionImageModel;
  }

  protected renderElement(): React.JSX.Element {
    const question = this.question;
    if (!question || !isPrivateStorageContext(this.context)) {
      return super.renderElement();
    }

    if (question.renderedMode !== "image") {
      return super.renderElement();
    }

    const rawSrc =
      question.imageLink || question.locImageLink?.renderedHtml || "";
    if (rawSrc.length === 0) {
      return super.renderElement();
    }

    const cssClasses = question.getImageCss();
    const style: React.CSSProperties = {
      objectFit: toCssObjectFit(question.imageFit),
      width: question.renderedStyleWidth,
      height: question.renderedStyleHeight,
    };

    if (!question.imageLink || question.contentNotLoaded) {
      style.display = "none";
    }

    const control = (
      <StoragePresignedImage
        className={cssClasses}
        src={rawSrc}
        alt={question.renderedAltText}
        width={question.renderedWidth}
        height={question.renderedHeight}
        style={style}
        onLoad={() => {
          question.onLoadHandler();
        }}
        onError={() => {
          question.onErrorHandler();
        }}
      />
    );

    let noImage: React.JSX.Element | null = null;
    if (!question.imageLink || question.contentNotLoaded) {
      noImage = (
        <div className={question.cssClasses.noImage}>
          <SvgIcon iconName={question.cssClasses.noImageSvgIconId} size={48} />
        </div>
      );
    }

    return (
      <div className={question.cssClasses.root}>
        {control}
        {noImage}
      </div>
    );
  }
}

function registerProtectedImages(): void {
  if (globalThis.window === undefined || isRegistered) {
    return;
  }

  ReactQuestionFactory.Instance.registerQuestion("image", (props) => {
    return React.createElement(ProtectedQuestionImage, props);
  });

  ProtectedQuestionImage.contextType = AssetStorageContext;

  isRegistered = true;
}

export { ProtectedQuestionImage, registerProtectedImages };
