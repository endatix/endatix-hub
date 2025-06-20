import { PanelModel, QuestionPanelDynamicModel } from "survey-core";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import PdfAnswerViewer, { PDF_STYLES } from "./pdf-answer-viewer";

interface PanelDynamicAnswerProps {
  question: QuestionPanelDynamicModel;
}

const styles = StyleSheet.create({
  panelContainer: {
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
  panelTitle: {
    fontSize: 12,
    fontFamily: "Roboto-Bold",
    marginBottom: 8,
  },
  noPanelsText: {
    fontFamily: "Roboto",
    fontSize: 12,
    color: "gray",
  },
});

const PdfPanelDynamicAnswer = ({ question }: PanelDynamicAnswerProps) => {
  const panels: PanelModel[] = question.panels;
  if (!panels || panels.length === 0) {
    return (
      <View style={PDF_STYLES.nonFileAnswerContainer}>
        <Text style={PDF_STYLES.questionLabel}>{question.title}:</Text>
        <Text style={styles.noPanelsText}>There are no panels filled</Text>
      </View>
    );
  }

  return (
    <View>
      {panels.map((panel, index) => (
        <Panel key={panel.id} panel={panel} index={index} />
      ))}
    </View>
  );
};

const Panel = ({ panel, index }: { panel: PanelModel; index: number }) => {
  const panelTitle = panel.processedTitle || `Panel ${index + 1}`;
  return (
    <View style={styles.panelContainer}>
      <Text style={styles.panelTitle}>{panelTitle}</Text>
      {panel.getQuestions(false).map((q) => (
        <PdfAnswerViewer key={q.id} forQuestion={q} panelTitle={panelTitle} />
      ))}
    </View>
  );
};

export default PdfPanelDynamicAnswer;
