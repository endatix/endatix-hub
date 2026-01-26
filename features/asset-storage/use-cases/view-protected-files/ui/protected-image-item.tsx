/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AssetStorageContext,
  enrichImagesInContainer,
} from "@/features/asset-storage/client";
import * as React from "react";
import {
  ReactElementFactory,
  ReactQuestionFactory,
  SurveyQuestionImagePicker,
} from "survey-react-ui";
import { ImageItemValue } from "survey-core";
import { ImageItemValueAdornerComponent } from "survey-creator-react";

let isRegistered = false;

/**
 * A custom image picker question component that ensures images in private storage
 * are rendered with a SAS token.
 */
class ProtectedSurveyQuestionImagePicker extends SurveyQuestionImagePicker {
  declare context: React.ContextType<typeof AssetStorageContext>;

  constructor(props: any) {
    super(props);
  }

  componentDidMount() {
    super.componentDidMount();
  }

  componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<any>) {
    super.componentDidUpdate(prevProps, prevState);
  }

  componentWillUnmount(): void {
    super.componentWillUnmount();
  }

  protected renderItem(
    item: ImageItemValue,
    cssClasses: any,
  ): React.JSX.Element {
    const ctx = this.context;
    const isPrivatedStorageEnabled =
      ctx?.config?.isEnabled && ctx.config.isPrivate && ctx.resolveStorageUrl;

    if (isPrivatedStorageEnabled && item.locImageLink.renderedHtml) {
      const enrichedImageLink = ctx.resolveStorageUrl(
        item.locImageLink.renderedHtml,
      );
      if (enrichedImageLink === item.locImageLink.renderedHtml) {
        return super.renderItem(item, cssClasses);
      }

      const newItem = item.clone() as ImageItemValue;
      newItem.imageLink = enrichedImageLink;

      return super.renderItem(newItem, cssClasses);
    }

    return super.renderItem(item, cssClasses);
  }
}

/**
 * A custom image item value adorner that wraps the ImageItemValueAdornerComponent and ensures images in private storage
 * are rendered with a SAS token.
 * To be used within the Survey Creator only.
 */
class ProtectedImageItemValueAdorner extends ImageItemValueAdornerComponent {
  declare context: React.ContextType<typeof AssetStorageContext>;

  constructor(props: any) {
    super(props);
  }

  componentDidMount() {
    super.componentDidMount();
  }

  componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<any>) {
    super.componentDidUpdate(prevProps, prevState);
    const isNew = !this.props.question.isItemInList(this.props.item);
    if (!isNew) {
      this.updateImages();
    }
  }

  componentWillUnmount(): void {
    super.componentWillUnmount();
  }

  private updateImages() {
    setTimeout(() => {
      const context = this.context;
      if (!context) return;

      const root = this.model.itemsRoot;
      const config = context.config;

      if (config?.isEnabled && config.isPrivate) {
        enrichImagesInContainer(root, context.resolveStorageUrl);
      }
    }, 0);
  }
}

function registerProtectedImageItem() {
  if (globalThis.window === undefined || isRegistered) return;

  ReactQuestionFactory.Instance.registerQuestion(
    "imagepicker",
    (props: any) => {
      return React.createElement(ProtectedSurveyQuestionImagePicker, props);
    },
  );

  ReactElementFactory.Instance.registerElement(
    "svc-image-item-value",
    (props: any) => {
      return React.createElement(ProtectedImageItemValueAdorner, props);
    },
  );

  ProtectedImageItemValueAdorner.contextType = AssetStorageContext;
  ProtectedSurveyQuestionImagePicker.contextType = AssetStorageContext;

  isRegistered = true;
}

export {
  ProtectedSurveyQuestionImagePicker,
  ProtectedImageItemValueAdorner,
  registerProtectedImageItem,
};
