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
  protected get question(): QuestionFileModel {
    return this.props.question;
  }

  protected renderElement(): React.JSX.Element | null {
    const question = this.question;

    return (
      <AssetStorageContext.Consumer>
        {(contextValue) => {
          const config = contextValue?.config;
          if (!config?.isEnabled || !config?.isPrivate) {
            return super.renderElement();
          }

          const currentShownPage = question.renderedPages[question.indexToShow];
          if (currentShownPage) {
            currentShownPage.items = currentShownPage.items.map(
              (item: IFile) => {
                const shownFile = question.value?.find(
                  (file: IFile) => file.content === item.content,
                );
                if (shownFile?.token) {
                  const content = item.content;
                  item.content = `${content}?${shownFile.token}`;
                }
                return item;
              },
            );
          }

          return super.renderElement();
        }}
      </AssetStorageContext.Consumer>
    );
  }
}

function registerProtectedFilePreview() {
  if (globalThis.window === undefined || isRegistered) return;

  ReactElementFactory.Instance.registerElement("sv-file-preview", (props) => {
    return React.createElement(ProtectedFilePreview, props);
  });

  isRegistered = true;
}

export { ProtectedFilePreview, registerProtectedFilePreview };

