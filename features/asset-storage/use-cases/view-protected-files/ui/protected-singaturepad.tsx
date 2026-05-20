import { AssetStorageContext } from "@/features/asset-storage/ui/asset-storage.context";
import React from "react";
import {
  ReactQuestionFactory,
  SurveyQuestionSignaturePad,
} from "survey-react-ui";
import {
  isPrivateStorageContext,
  StoragePresignedImage,
} from "./protected-storage-media";

let isRegistered = false;

class ProtectedSignaturePad extends SurveyQuestionSignaturePad {
  declare context: React.ContextType<typeof AssetStorageContext>;

  renderBackgroundImage(): React.JSX.Element | null {
    if (!this.question.backgroundImage) {
      return null;
    }

    if (!isPrivateStorageContext(this.context)) {
      return super.renderBackgroundImage();
    }

    return (
      <StoragePresignedImage
        className={this.question.cssClasses.backgroundImage}
        src={this.question.backgroundImage}
        style={{ width: this.question.renderedCanvasWidth }}
        role="presentation"
      />
    );
  }
}

function registerProtectedSignaturePad(): void {
  if (globalThis.window === undefined || isRegistered) {
    return;
  }

  ReactQuestionFactory.Instance.registerQuestion("signaturepad", (props) => {
    return React.createElement(ProtectedSignaturePad, props);
  });
  ProtectedSignaturePad.contextType = AssetStorageContext;

  isRegistered = true;
}

export { ProtectedSignaturePad, registerProtectedSignaturePad };
