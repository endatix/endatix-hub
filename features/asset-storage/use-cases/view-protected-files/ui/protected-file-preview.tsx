import { AssetStorageContext } from "@/features/asset-storage/ui/asset-storage.context";
import { QuestionFileModel } from "survey-core";
import { ReactElementFactory, SurveyFilePreview } from "survey-react-ui";
import * as React from "react";
import { isPrivateStorageContext } from "./protected-storage-media";

let isRegistered = false;

/**
 * File preview container. Per-item presign is handled by {@link ProtectedSurveyFileItem}.
 */
class ProtectedFilePreview extends SurveyFilePreview {
  declare context: React.ContextType<typeof AssetStorageContext>;

  protected get question(): QuestionFileModel {
    return this.props.question;
  }

  protected renderElement(): React.JSX.Element | null {
    if (!isPrivateStorageContext(this.context)) {
      return super.renderElement();
    }

    return super.renderElement();
  }
}

function registerProtectedFilePreview(): void {
  if (globalThis.window === undefined || isRegistered) {
    return;
  }

  ReactElementFactory.Instance.registerElement("sv-file-preview", (props) => {
    return React.createElement(ProtectedFilePreview, props);
  });
  ProtectedFilePreview.contextType = AssetStorageContext;

  isRegistered = true;
}

export { ProtectedFilePreview, registerProtectedFilePreview };
