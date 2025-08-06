import { Question, Serializer, QuestionFactory } from "survey-core";
import { useEffect, useRef } from "react";
import { ReactElementFactory } from "survey-react-ui";

export const SCANDIT_QUESTION_TYPE = "scandit";

export class ScanditQuestionModel extends Question {
  getType() {
    return SCANDIT_QUESTION_TYPE;
  }
}

// Register model with Serializer (following SurveyJS pattern)
Serializer.addClass(
  SCANDIT_QUESTION_TYPE,
  [],
  () => new ScanditQuestionModel(""),
  "question",
);

// Register model with QuestionFactory (following SurveyJS pattern)
QuestionFactory.Instance.registerQuestion(SCANDIT_QUESTION_TYPE, (name) => {
  return new ScanditQuestionModel(name);
});

function ScanditComponent({ question }: { question: ScanditQuestionModel }) {
  console.log("ScanditComponent", question);

  const inputRef = useRef<HTMLInputElement>(null);

  if (inputRef.current) {
    inputRef.current.value = "";
  }

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      console.log("Message received from React Native:", event.data);
      if (inputRef.current) {
        inputRef.current.value = event.data;
      }
    };
    (document as unknown as Document).addEventListener(
      "message",
      handler as EventListener,
    );
    return () =>
      (document as unknown as Document).removeEventListener(
        "message",
        handler as EventListener,
      );
  }, []);

  const handleClick = () => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage("Scandit requested");
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Scan a Barcode</button>&nbsp;
      <input type="text" id="scandit-input" ref={inputRef} />
    </div>
  );
}

// Register React component (following SurveyJS pattern)
ReactElementFactory.Instance.registerElement(SCANDIT_QUESTION_TYPE, (props) => (
  <ScanditComponent {...props} />
));