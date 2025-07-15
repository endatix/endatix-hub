## Sending and receiving messsages from React Native WebView

1. Get a reference to the webview:
```
const webViewRef = useRef<WebViewType>(null);
```
2. Send a message to Endatix Hub:
```
if (webViewRef.current) {
    webViewRef.current.postMessage('Barcode: 123456789');
}
```
3. To listen for messages from Endatix Hub handle the webview's onMessage event:
```
<WebView
    ref={webViewRef}
    source={{ uri: surveyUrl }}
    style={styles.webview}
    originWhitelist={['*']}
    javaScriptEnabled={true}
    domStorageEnabled={true}
    allowsInlineMediaPlayback={true}
    mediaPlaybackRequiresUserAction={false}
    automaticallyAdjustContentInsets={false}
    scrollEnabled={true}
    containerStyle={styles.webview}
    onMessage={(event) => {
        // Handle messages from the survey page. Trigger Scandit here.
        console.log('Message from survey:', event.nativeEvent.data);
    }}
/>
```

## Create a SurveyJS custom question

Create a folder for your custom question under `app/lib/questions/`. Add the custom question code in that folder, using `scandit-question-model.tsx` as a template or following this guide: https://surveyjs.io/form-library/documentation/customize-question-types/third-party-component-integration-react

Register the custom question by adding it to `app/lib/questions/infrastructure/custom-questions.ts`, as follows:

```
QuestionFactory.Instance.registerQuestion("scandit", name => {
  return new ScanditQuestionModel(name);
});
```

## Send and receive messages from the custom question

To receive a message:
```
useEffect(() => {
    const handler = (event: MessageEvent) => {
      console.log("Message received from React Native:", event.data);
      if (inputRef.current) {
        inputRef.current.value = event.data;
      }
    };
    (document as any).addEventListener("message", handler);
    return () => (document as any).removeEventListener("message", handler);
  }, []);
```

To send a message:
```
if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage("Scandit requested");
}
```