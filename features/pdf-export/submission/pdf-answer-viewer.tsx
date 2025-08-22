import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  MultipleTextItemModel,
  Question,
  QuestionBooleanModel,
  QuestionFileModel,
  QuestionMatrixDropdownModel,
  QuestionMultipleTextModel,
  QuestionPanelDynamicModel,
  QuestionSignaturePadModel,
  QuestionCheckboxModel,
  QuestionMatrixModel,
  QuestionCustomModel,
  QuestionCompositeModel,
  QuestionRankingModel,
  QuestionRadiogroupModel,
  QuestionDropdownModel,
} from "survey-core";
import PdfFileAnswer from "./answers/pdf-file-answer";
import { QuestionType } from "@/lib/questions";
import { MessageSquareTextIcon } from "@/features/pdf-export/submission/icons";
import PdfSignaturePadAnswer from "./answers/pdf-signaturepad-answer";
import PdfPanelDynamicAnswer from "./answers/pdf-paneldynamic-answer";
import PdfMatrixDropdownAnswer from "./answers/pdf-matrixdropdown-answer";
import PdfTagBoxAnswer from "./answers/pdf-tagbox-answer";
import PdfCheckboxAnswer from "./answers/pdf-checkbox-answer";
import PdfBooleanAnswer from "./answers/pdf-boolean-answer";
import PdfMatrixAnswer from "./answers/pdf-matrix-answer";
import PdfCustomAnswer from "./answers/pdf-custom-answer";
import PdfRankingAnswer from "./answers/pdf-ranking-answer";

export interface ViewAnswerProps {
  forQuestion: Question;
  pageBreak?: boolean;
  hideTitle?: boolean;
}

const PdfAnswerViewer = ({
  forQuestion,
  pageBreak,
  hideTitle,
}: ViewAnswerProps): React.ReactElement => {
  if (
    forQuestion instanceof QuestionCustomModel ||
    forQuestion instanceof QuestionCompositeModel
  ) {
    return <PdfCustomAnswer question={forQuestion} />;
  }

  let questionType = forQuestion.getType() ?? "unsupported";

  // If the type is not a valid QuestionType, try to get it from jsonObj
  if (!Object.values(QuestionType).includes(questionType as QuestionType)) {
    questionType = (forQuestion as Question).getType() ?? questionType;
  }

  const questionTitle = forQuestion.processedTitle ?? forQuestion.title;

  const renderTitle = () => {
    if (hideTitle) return null;
    return <Text style={VIEWER_STYLES.questionLabel}>{questionTitle}:</Text>;
  };

  const renderTextAnswer = () => (
    <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={VIEWER_STYLES.answerText}>
        {forQuestion.value || "No Answer"}
      </Text>
    </View>
  );

  const renderBooleanAnswer = () => (
    <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
      {renderTitle()}
      <PdfBooleanAnswer question={forQuestion as QuestionBooleanModel} />
    </View>
  );

  const renderRatingAnswer = () => (
    <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={VIEWER_STYLES.answerText}>
        {forQuestion.value || "No Answer"}
      </Text>
    </View>
  );

  const renderRadiogroupAnswer = () => (
    <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={VIEWER_STYLES.answerText}>
        {((forQuestion as QuestionRadiogroupModel).selectedItem?.text) || forQuestion.value || "No Answer"}
      </Text>
    </View>
  );

  const renderDropdownAnswer = () => (
    <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={VIEWER_STYLES.answerText}>
        {((forQuestion as QuestionDropdownModel).selectedItem?.text) || forQuestion.value || "No Answer"}
      </Text>
    </View>
  );

  const renderCommentAnswer = () => (
    <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={VIEWER_STYLES.answerText}>
        {forQuestion.value || "No Answer"}
      </Text>
    </View>
  );

  const renderTagBoxAnswer = () => (
    <View style={VIEWER_STYLES.answerContainer} wrap={false}>
      {renderTitle()}
      <PdfTagBoxAnswer question={forQuestion} />
    </View>
  );

  const renderFileAnswer = () => (
    <View
      style={VIEWER_STYLES.fileAnswerContainer}
      break={pageBreak}
      wrap={false}
    >
      {renderTitle()}
      <PdfFileAnswer question={forQuestion as QuestionFileModel} />
      {forQuestion?.supportComment() &&
        forQuestion?.hasComment &&
        forQuestion?.comment && (
          <View style={VIEWER_STYLES.flexRow}>
            <MessageSquareTextIcon />
            <View style={VIEWER_STYLES.flexColumn}>
              <Text
                style={[VIEWER_STYLES.questionLabel, VIEWER_STYLES.smallText]}
              >
                Comment:
              </Text>
              <Text style={[VIEWER_STYLES.mutedText, VIEWER_STYLES.smallText]}>
                {forQuestion?.comment}
              </Text>
            </View>
          </View>
        )}
    </View>
  );

  const renderSignaturePadAnswer = () => (
    <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
      {renderTitle()}
      <PdfSignaturePadAnswer
        question={forQuestion as QuestionSignaturePadModel}
      />
    </View>
  );

  const renderPanelDynamicAnswer = () => (
    <View>
      <PdfPanelDynamicAnswer
        question={forQuestion as QuestionPanelDynamicModel}
      />
    </View>
  );

  const renderMatrixAnswer = () => (
    <View>
      {renderTitle()}
      <PdfMatrixAnswer question={forQuestion as QuestionMatrixModel} />
    </View>
  );

  const renderMatrixDropdownAnswer = () => (
    <View>
      {renderTitle()}
      <PdfMatrixDropdownAnswer
        question={forQuestion as QuestionMatrixDropdownModel}
      />
    </View>
  );

  const renderMultipleTextAnswer = () => {
    const question = forQuestion as QuestionMultipleTextModel;

    return (
      <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
        {renderTitle()}
        {question?.items?.map((item: MultipleTextItemModel) => (
          <Text key={item.name} style={VIEWER_STYLES.answerText}>
            {item.value}
          </Text>
        ))}
      </View>
    );
  };

  const renderRankingAnswer = () => (
    <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
      {renderTitle()}
      <PdfRankingAnswer question={forQuestion as QuestionRankingModel} />
    </View>
  );

  const renderCheckboxAnswer = () => (
    <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
      {renderTitle()}
      <PdfCheckboxAnswer question={forQuestion as QuestionCheckboxModel} />
    </View>
  );

  const renderUnknownAnswer = () => {
    if (forQuestion.getType() === "html" || forQuestion.getType() === "image") {
      return <View />;
    }

    const isStringValue = typeof forQuestion?.value === "string";

    return (
      <View style={VIEWER_STYLES.answerContainer} break={pageBreak}>
        {renderTitle()}
        {isStringValue ? (
          <Text style={VIEWER_STYLES.answerText}>{forQuestion.value}</Text>
        ) : (
          <Text style={VIEWER_STYLES.answerText}>
            {JSON.stringify(forQuestion.value, null, 2)}
          </Text>
        )}
      </View>
    );
  };

  switch (questionType) {
    case QuestionType.Text:
      return renderTextAnswer();
    case QuestionType.Boolean:
      return renderBooleanAnswer();
    case QuestionType.Rating:
      return renderRatingAnswer();
    case QuestionType.Radiogroup:
      return renderRadiogroupAnswer();
    case QuestionType.Dropdown:
      return renderDropdownAnswer();
    case QuestionType.Matrix:
      return renderMatrixAnswer();
    case QuestionType.Comment:
      return renderCommentAnswer();
    case QuestionType.File:
    case QuestionType.AudioRecorder:
      return renderFileAnswer();
    case QuestionType.SignaturePad:
      return renderSignaturePadAnswer();
    case QuestionType.MultipleText:
      return renderMultipleTextAnswer();
    case QuestionType.Ranking:
      return renderRankingAnswer();
    case QuestionType.TagBox:
      return renderTagBoxAnswer();
    case QuestionType.PanelDynamic:
      return renderPanelDynamicAnswer();
    case QuestionType.MatrixDropdown:
    case QuestionType.MatrixDynamic:
      return renderMatrixDropdownAnswer();
    case QuestionType.Checkbox:
      return renderCheckboxAnswer();
    default:
      return renderUnknownAnswer();
  }
};

export const VIEWER_STYLES = StyleSheet.create({
  fileAnswerContainer: {
    marginBottom: 8,
    padding: 8,
  },
  booleanAnswer: {
    fontFamily: "Roboto-Bold",
    fontSize: 10,
    padding: 3,
    textAlign: "center",
  },
  booleanYes: {
    color: "#006105",
  },
  booleanNo: {
    color: "#FF0000",
  },
  questionLabel: {
    fontFamily: "Roboto-Bold",
    fontSize: 12,
    marginBottom: 4,
    flexGrow: 1,
  },
  answerText: {
    fontFamily: "Roboto",
    fontSize: 10,
    flex: 1,
  },
  answerContainer: {
    fontFamily: "Roboto",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    padding: 4,
    marginBottom: 4,
  },
  nonFileAnswerContainer: {
    fontFamily: "Roboto",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    borderBottomStyle: "solid",
  },

  flexRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "flex-start",
  },
  flexColumn: {
    display: "flex",
    flexDirection: "column",
    flexWrap: "wrap",
  },
  icon: {
    width: 24,
    height: 24,
  },
  smallText: {
    fontSize: 10,
  },
  mutedText: {
    color: "gray",
  },
});

export default PdfAnswerViewer;
