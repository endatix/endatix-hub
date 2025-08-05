import { Question } from "survey-core";
import { ReactElementFactory } from "survey-react-ui";
import { useEffect, useRef } from "react";

export class ScanditQuestionModel extends Question {
  getType() {
    return "scandit";
  }
}

function ScanditComponent({ question }: { question: ScanditQuestionModel }) {
  console.log("ScanditComponent", question);

  const inputRef = useRef<HTMLInputElement>(null);

  if (inputRef.current) {
    inputRef.current.value ="";
  }

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      console.log("Message received from React Native:", event.data);
      if (inputRef.current) {
        inputRef.current.value = event.data;
      }
    };
    (document as unknown as Document).addEventListener("message", handler as EventListener);
    return () => (document as unknown as Document).removeEventListener("message", handler as EventListener);
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

ReactElementFactory.Instance.registerElement("scandit", props => <ScanditComponent {...props} />);
