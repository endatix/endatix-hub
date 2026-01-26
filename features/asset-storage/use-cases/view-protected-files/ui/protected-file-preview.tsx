import { AssetStorageContext } from "@/features/asset-storage/client";
import { IFile } from "@/lib/questions/file/file-type";
import * as React from "react";
import { QuestionFileModel } from "survey-core";
import { ReactElementFactory, SurveyFilePreview } from "survey-react-ui";

let isRegistered = false;

/**
 * A custom file preview component that renders the file preview for a file question.
 * It will only render the file preview if the storage is enabled and private.
 * It will also add the token to the file content if the file is in private storage.
 */
class ProtectedFilePreview extends SurveyFilePreview {
  declare context: React.ContextType<typeof AssetStorageContext>;

  protected get question(): QuestionFileModel {
    return this.props.question;
  }

  protected renderElement(): React.JSX.Element | null {
    const question = this.question;
    const config = this.context?.config;
    if (!config?.isEnabled || !config?.isPrivate) {
      return super.renderElement();
    }

    const resolveStorageUrl = this.context?.resolveStorageUrl;

    const currentShownPage = question.renderedPages[question.indexToShow];
    if (currentShownPage && resolveStorageUrl) {
      currentShownPage.items.forEach((item: IFile) => {
        if (item.content) {
          item.content = resolveStorageUrl(item.content);
        }
      });
    }

    return super.renderElement();
  }
}

function registerProtectedFilePreview() {
  if (globalThis.window === undefined || isRegistered) return;

  ReactElementFactory.Instance.registerElement("sv-file-preview", (props) => {
    return React.createElement(ProtectedFilePreview, props);
  });
  ProtectedFilePreview.contextType = AssetStorageContext;

  isRegistered = true;
}

export { ProtectedFilePreview, registerProtectedFilePreview };
