import { PanelModel, QuestionPanelDynamicModel } from "survey-core";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import PdfAnswerViewer, { VIEWER_STYLES } from "../pdf-answer-viewer";

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
      <View style={VIEWER_STYLES.answerContainer}>
        <Text style={VIEWER_STYLES.questionLabel}>{question.title}:</Text>
        <Text style={styles.noPanelsText}>There are no panels filled</Text>
      </View>
    );
  }

  return (
    <View>
      {panels.map((panel, index) => (
        <Panel
          key={panel.id}
          panel={panel}
          index={index}
          showTitle={panels.length > 1}
        />
      ))}
    </View>
  );
};

const Panel = ({
  panel,
  index,
  showTitle,
}: {
  panel: PanelModel;
  index: number;
  showTitle: boolean;
}) => {
  const panelTitle = panel.processedTitle || `Panel ${index + 1}`;
  return (
    <View style={styles.panelContainer}>
      {showTitle && <Text style={styles.panelTitle}>{panelTitle}</Text>}
      {panel.getQuestions(false).map((q) => (
        <PdfAnswerViewer key={q.id} forQuestion={q} />
      ))}
    </View>
  );
};

export default PdfPanelDynamicAnswer;
