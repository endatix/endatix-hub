import { Checkbox, FieldSet, Text, View } from "@react-pdf/renderer";
import { ItemValue, QuestionCheckboxModel } from "survey-core";
import {
  formatChoiceDisplay,
  resolveChoiceLabel,
  resolveItemValueLabel,
} from "../format-choice-display";
import {
  pdfFormFieldProps,
  sanitizePdfFieldName,
  type PdfFormChrome,
} from "../pdf-form-field";

interface CheckboxAnswerProps {
  question: QuestionCheckboxModel;
  chrome: PdfFormChrome;
}

function choiceLabel(question: QuestionCheckboxModel, item: ItemValue): string {
  return formatChoiceDisplay(
    item.value,
    resolveChoiceLabel(question, item.value) ?? resolveItemValueLabel(item),
  );
}

const PdfCheckboxAnswer = ({ question, chrome }: CheckboxAnswerProps) => {
  const choices: ItemValue[] = question.visibleChoices ?? [];
  const selected = new Set(
    (question.selectedChoices ?? []).map((item) => String(item.value)),
  );
  const { checkboxBox, stack, row, answerText, mutedText } = chrome.themeStyles;

  if (choices.length === 0) {
    return <Text style={mutedText}>No items</Text>;
  }

  if (!chrome.fillable) {
    return (
      <View style={stack}>
        {choices.map((item) => {
          const checked = selected.has(String(item.value));
          return (
            <Text key={String(item.value)} style={answerText}>
              {checked ? "[x]" : "[ ]"} {choiceLabel(question, item)}
            </Text>
          );
        })}
      </View>
    );
  }

  const field = pdfFormFieldProps(chrome);

  return (
    <FieldSet name={sanitizePdfFieldName(question.name)}>
      <View style={stack}>
        {choices.map((item) => {
          const name = sanitizePdfFieldName(`choice.${String(item.value)}`);
          return (
            <View key={name} style={row}>
              <Checkbox
                {...field}
                name={name}
                checked={selected.has(String(item.value))}
                style={checkboxBox}
              />
              <Text style={answerText}>{choiceLabel(question, item)}</Text>
            </View>
          );
        })}
      </View>
    </FieldSet>
  );
};

export default PdfCheckboxAnswer;
