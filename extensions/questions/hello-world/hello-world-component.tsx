import React from "react";
import {
  ReactQuestionFactory,
  SurveyQuestionElementBase,
} from "survey-react-ui";
import {
  HELLO_WORLD_QUESTION_TYPE,
  HelloWorldQuestionModel,
} from "./hello-world-model";

class HelloWorldComponent extends SurveyQuestionElementBase {
  protected get question(): HelloWorldQuestionModel {
    return this.questionBase as unknown as HelloWorldQuestionModel;
  }

  protected renderElement(): React.JSX.Element {
    return (
      <div
        ref={(root) => this.setControl(root)}
        className="rounded-md border border-border bg-muted/30 p-4"
      >
        <p className="font-medium text-foreground">Hello World</p>
        <p className="text-sm text-muted-foreground mt-1">
          Value: {this.question.value ?? "(empty)"}
        </p>
        <input
          type="text"
          className="mt-2 w-full max-w-xs rounded border border-input bg-background px-3 py-2 text-sm"
          placeholder="Type something..."
          value={this.question.value ?? ""}
          onChange={(e) => {
            this.question.value = e.target.value;
          }}
        />
      </div>
    );
  }
}

ReactQuestionFactory.Instance.registerQuestion(
  HELLO_WORLD_QUESTION_TYPE,
  (props) => React.createElement(HelloWorldComponent, props),
);
