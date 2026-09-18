import { FieldSet, List, Text } from "@react-pdf/renderer";
import { Question } from "survey-core";
import type { PdfFormChrome } from "../pdf-form-field";
import { pdfFormFieldProps, sanitizePdfFieldName } from "../pdf-form-field";
import {
  formatChoiceDisplay,
  resolveChoiceLabel,
} from "../format-choice-display";

interface TagBoxAnswerProps {
  question: Question;
  chrome: PdfFormChrome;
}

const PdfTagBoxAnswer = ({ question, chrome }: TagBoxAnswerProps) => {
  const choices = (question.visibleChoices ?? question.choices ?? []) as {
    value: string;
    text?: string;
  }[];
  const labels = choices.map((item) =>
    formatChoiceDisplay(
      item.value,
      resolveChoiceLabel(question, item.value) ?? item.text,
    ),
  );
  const selectedValues: string[] = Array.isArray(question.value)
    ? question.value.map(String)
    : [];
  const selectedLabels = selectedValues.map((value) =>
    formatChoiceDisplay(value, resolveChoiceLabel(question, value)),
  );

  if (labels.length === 0 && selectedLabels.length === 0) {
    return <Text style={chrome.themeStyles.mutedText}>No Answer</Text>;
  }

  const display = selectedLabels.join(", ") || "—";
  if (!chrome.fillable) {
    return <Text style={chrome.themeStyles.answerText}>{display}</Text>;
  }

  const field = pdfFormFieldProps(chrome);

  return (
    <FieldSet name={sanitizePdfFieldName(question.name)}>
      <List
        {...field}
        name="choices"
        multiSelect
        edit={false}
        noSpell
        select={labels.length > 0 ? labels : selectedLabels}
        value={selectedLabels.join(", ")}
        style={chrome.themeStyles.formList}
      />
    </FieldSet>
  );
};

export default PdfTagBoxAnswer;
