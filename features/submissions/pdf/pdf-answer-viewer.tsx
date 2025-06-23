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
} from "survey-core";
import PdfFileAnswer from "./pdf-file-answer";
import { QuestionType } from "@/lib/questions";
import { MessageSquareTextIcon } from "@/features/pdf-export/components/icons";
import PdfSignaturePadAnswer from "./pdf-signaturepad-answer";
import PdfPanelDynamicAnswer from "./pdf-paneldynamic-answer";
import PdfMatrixDropdownAnswer from './pdf-matrixdropdown-answer';
import PdfTagBoxAnswer from './pdf-tagbox-answer';
import PdfCheckboxAnswer from './pdf-checkbox-answer';
import PdfBooleanAnswer from './pdf-boolean-answer';

export interface ViewAnswerProps {
  forQuestion: Question;
  panelTitle?: string;
  pageBreak?: boolean;
  hideTitle?: boolean;
}

const PdfAnswerViewer = ({
  forQuestion,
  panelTitle,
  pageBreak,
  hideTitle,
}: ViewAnswerProps): React.ReactElement => {
  let questionType = forQuestion.getType() ?? "unsupported";

  // If the type is not a valid QuestionType, try to get it from jsonObj
  if (!Object.values(QuestionType).includes(questionType as QuestionType)) {
    questionType = (forQuestion as Question).getType() ?? questionType;
  }

  const questionTitle = panelTitle
    ? `(${panelTitle}) ${forQuestion.title}`
    : forQuestion.title;

  const renderTitle = () => {
    if (hideTitle) return null;
    return <Text style={PDF_STYLES.questionLabel}>{questionTitle}:</Text>;
  };

  const renderTextAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={PDF_STYLES.answerText}>
        {forQuestion.value || "No Answer"} 
      </Text>
    </View>
  );

  const renderBooleanAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
      {renderTitle()}
      <PdfBooleanAnswer question={forQuestion as QuestionBooleanModel} />
    </View>
  );

  const renderRatingAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={PDF_STYLES.answerText}>
        {forQuestion.value || "No Answer"}
      </Text>
    </View>
  );

  const renderRadiogroupAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={PDF_STYLES.answerText}>
        {forQuestion.value || "No Answer"}
      </Text>
    </View>
  );

  const renderDropdownAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={PDF_STYLES.answerText}>
        {forQuestion.value || "No Answer"}
      </Text>
    </View>
  );

  const renderRankingAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={PDF_STYLES.answerText}>
        {Array.isArray(forQuestion.value)
          ? forQuestion.value.join(", ")
          : "No Answer"}
      </Text>
    </View>
  );

  const renderMatrixAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={PDF_STYLES.answerText}>
        {JSON.stringify(forQuestion.value, null, 2) || "No Answer"}
      </Text>
    </View>
  );

  const renderCommentAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
      {renderTitle()}
      <Text style={PDF_STYLES.answerText}>
        {forQuestion.value || "No Answer"}
      </Text>
    </View>
  );

  const renderTagBoxAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} wrap={false}>
      {renderTitle()}
      <PdfTagBoxAnswer question={forQuestion} />
    </View>
  );

  const renderFileAnswer = () => (
    <View style={PDF_STYLES.fileAnswerContainer} break={pageBreak} wrap={false}>
      {renderTitle()}
      <PdfFileAnswer question={forQuestion as QuestionFileModel} />
      {forQuestion?.supportComment() &&
        forQuestion?.hasComment &&
        forQuestion?.comment && (
          <View style={PDF_STYLES.flexRow}>
            <MessageSquareTextIcon />
            <View style={PDF_STYLES.flexColumn}>
              <Text style={[PDF_STYLES.questionLabel, PDF_STYLES.smallText]}>
                Comment:
              </Text>
              <Text style={[PDF_STYLES.mutedText, PDF_STYLES.smallText]}>
                {forQuestion?.comment}
              </Text>
            </View>
          </View>
        )}
    </View>
  );

  const renderSignaturePadAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
      {renderTitle()}
      <PdfSignaturePadAnswer
        question={forQuestion as QuestionSignaturePadModel}
      />
    </View>
  );

  const renderPanelDynamicAnswer = () => (
    <View>
      {renderTitle()}
      <PdfPanelDynamicAnswer
        question={forQuestion as QuestionPanelDynamicModel}
      />
    </View>
  );

  const renderMatrixDropdownAnswer = () => (
    <View>
      {renderTitle()}
      <PdfMatrixDropdownAnswer question={forQuestion as QuestionMatrixDropdownModel} />
    </View>
  );

  const renderMultipleTextAnswer = () => {
    const question = forQuestion as QuestionMultipleTextModel;

    return (
      <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
        {renderTitle()}
        {question?.items?.map((item: MultipleTextItemModel) => (
          <Text key={item.name} style={PDF_STYLES.answerText}>
            {item.value}
          </Text>
        ))}
      </View>
    );
  };

  const renderCheckboxAnswer = () => (
    <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
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
      <View style={PDF_STYLES.nonFileAnswerContainer} break={pageBreak}>
        {renderTitle()}
        {isStringValue ? (
          <Text style={PDF_STYLES.answerText}>{forQuestion.value}</Text>
        ) : (
          <Text style={PDF_STYLES.answerText}>
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
    case QuestionType.Ranking:
      return renderRankingAnswer();
    case QuestionType.Matrix:
      return renderMatrixAnswer();
    case QuestionType.Comment:
      return renderCommentAnswer();
    case QuestionType.File:
      return renderFileAnswer();
    case QuestionType.SignaturePad:
      return renderSignaturePadAnswer();
    case QuestionType.MultipleText:
      return renderMultipleTextAnswer();
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

export const PDF_STYLES = StyleSheet.create({
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
    width: "40%",
  },
  answerText: {
    fontFamily: "Roboto",
    fontSize: 10,
    flex: 1,
  },
  nonFileAnswerContainer: {
    fontFamily: "Roboto",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    borderBottomStyle: "solid",
    padding: 8,
    marginBottom: 8,
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
