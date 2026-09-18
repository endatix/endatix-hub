import { FieldSet, Text, TextInput, View } from "@react-pdf/renderer";
import { Question } from "survey-core";
import {
  formatChoiceDisplay,
  resolveChoiceLabel,
} from "../format-choice-display";
import {
  pdfFormFieldProps,
  sanitizePdfFieldName,
  type PdfFormChrome,
} from "../pdf-form-field";

interface PdfRankingAnswerProps {
  question: Question;
  chrome: PdfFormChrome;
}

const PdfRankingAnswer = ({ question, chrome }: PdfRankingAnswerProps) => {
  const rankedAnswers: string[] = question.value ?? [];
  const field = pdfFormFieldProps(chrome);

  if (rankedAnswers.length === 0) {
    return <Text style={chrome.themeStyles.mutedText}>No answer</Text>;
  }

  const lines = rankedAnswers.map((answer, index) => {
    const display = formatChoiceDisplay(
      answer,
      resolveChoiceLabel(question, answer),
    );
    return `${index + 1}. ${display}`;
  });

  if (!chrome.fillable) {
    return (
      <View style={chrome.themeStyles.stack}>
        {lines.map((line, index) => (
          <Text key={index} style={chrome.themeStyles.answerText}>
            {line}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <FieldSet name={sanitizePdfFieldName(question.name)}>
      <View style={chrome.themeStyles.stack}>
        {rankedAnswers.map((answer, index) => (
          <TextInput
            key={`${answer}-${index}`}
            {...field}
            name={sanitizePdfFieldName(`item.${index + 1}`)}
            value={lines[index]}
            style={chrome.themeStyles.formInput}
          />
        ))}
      </View>
    </FieldSet>
  );
};

export default PdfRankingAnswer;
