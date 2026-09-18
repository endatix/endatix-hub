import { PanelModel, QuestionPanelDynamicModel } from "survey-core";
import { FieldSet, Text, View } from "@react-pdf/renderer";
import type { PdfFormChrome } from "../pdf-form-field";
import { sanitizePdfFieldName } from "../pdf-form-field";
import PdfAnswerViewer, { VIEWER_STYLES } from "../pdf-answer-viewer";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";

interface PanelDynamicAnswerProps {
  question: QuestionPanelDynamicModel;
  chrome: PdfFormChrome;
}

const PdfPanelDynamicAnswer = ({
  question,
  chrome,
}: PanelDynamicAnswerProps) => {
  const panels: PanelModel[] = question.panels;
  if (!panels || panels.length === 0) {
    return (
      <View style={VIEWER_STYLES.answerContainer}>
        <Text style={chrome.themeStyles.questionLabel}>
          {pdfPlainText(question.title)}:
        </Text>
        <Text style={chrome.themeStyles.mutedText}>There are no panels filled</Text>
      </View>
    );
  }

  const body = panels.map((panel, index) => (
    <Panel
      key={panel.id}
      panel={panel}
      index={index}
      showTitle={panels.length > 1}
      chrome={chrome}
    />
  ));

  if (!chrome.fillable) {
    return <>{body}</>;
  }

  return (
    <FieldSet name={sanitizePdfFieldName(question.name)}>{body}</FieldSet>
  );
};

const Panel = ({
  panel,
  index,
  showTitle,
  chrome,
}: {
  panel: PanelModel;
  index: number;
  showTitle: boolean;
  chrome: PdfFormChrome;
}) => {
  const panelTitle = pdfPlainText(panel.processedTitle) || `Panel ${index + 1}`;
  const content = (
    <View style={chrome.themeStyles.panelDivider}>
      {showTitle && (
        <Text style={chrome.themeStyles.questionLabel}>{panelTitle}</Text>
      )}
      {panel.getQuestions(false).map((q) => (
        <PdfAnswerViewer
          key={q.id}
          forQuestion={q}
          hideTitle
          chrome={chrome}
        />
      ))}
    </View>
  );

  if (!chrome.fillable) {
    return content;
  }

  return (
    <FieldSet name={sanitizePdfFieldName(`panel.${index + 1}`)}>
      {content}
    </FieldSet>
  );
};

export default PdfPanelDynamicAnswer;
