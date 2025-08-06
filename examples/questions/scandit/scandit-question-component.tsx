import { useEffect, useRef } from 'react';
import { SCANDIT_QUESTION_TYPE, ScanditQuestionModel } from './scandit-question-model';
import { ReactElementFactory } from 'survey-react-ui';

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