import {
  SCANDIT_QUESTION_TYPE,
  ScanditQuestionModel,
} from "./scandit-question-model";
import {
  ReactQuestionFactory,
  SurveyQuestionElementBase,
} from "survey-react-ui";
import React from "react";

export class ScanditComponent extends SurveyQuestionElementBase {
  private inputRef: React.RefObject<HTMLInputElement | null>;

  constructor(props: unknown) {
    super(props);
    this.state = { value: this.question.value };
    this.inputRef = React.createRef();
  }

  protected get question(): ScanditQuestionModel {
    return this.questionBase as unknown as ScanditQuestionModel;
  }

  handleClick = () => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage("Scandit requested");
    }

    const SIMILATED_SCANDIT_DATA = Math.random().toString(36).substring(2, 15);
    this.question.value = SIMILATED_SCANDIT_DATA;
  };

  handler = (event: MessageEvent) => {
    console.log("Message received from React Native:", event.data);
    if (this.inputRef.current) {
      this.inputRef.current.value = event.data;
    }
  };

  componentDidMount(): void {
    super.componentDidMount();
    (document as unknown as Document).addEventListener(
      "message",
      this.handler as EventListener,
    );
  }

  componentWillUnmount(): void {
    super.componentWillUnmount();
    (document as unknown as Document).removeEventListener(
      "message",
      this.handler as EventListener,
    );
  }

  protected renderElement(): React.JSX.Element {
    return (
      <div ref={(root) => this.setControl(root)}>
        <button onClick={this.handleClick}>Scan a Barcode</button>&nbsp;
        <pre>value: {this.question?.value}</pre>
        <input type="text" id="scandit-input" ref={this.inputRef} />
      </div>
    );
  }
}

// Register React component (following SurveyJS pattern)
ReactQuestionFactory.Instance.registerQuestion(
  SCANDIT_QUESTION_TYPE,
  (props) => {
    return React.createElement(ScanditComponent, props);
  },
);
