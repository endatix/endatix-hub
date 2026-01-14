import * as React from "react";
import { QuestionFileModel } from "survey-core";
import { ReactElementFactory, SurveyFilePreview } from "survey-react-ui";
import { File } from "@/lib/questions/file/file-type";

export class PrivateFilePreview extends SurveyFilePreview {
  protected get question(): QuestionFileModel {
    return this.props.question;
  }

  protected renderElement(): React.JSX.Element | null {
    const question = this.question;

    const currentShownPage = question.renderedPages[question.indexToShow];
    if (currentShownPage) {
      currentShownPage.items = currentShownPage.items.map(
        (item: File) => {
          const shownFile = question.value?.find((file: File) => file.content === item.content);
          if (shownFile?.token) {
            const content = item.content as string;
            item.content = `${content}?${shownFile.token}`;
          }
          return item;
        },
      );
    }
    return super.renderElement();
  }
}

ReactElementFactory.Instance.registerElement("sv-file-preview", (props) => {
  return React.createElement(PrivateFilePreview, props);
});
