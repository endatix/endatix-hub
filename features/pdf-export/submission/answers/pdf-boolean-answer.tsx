import { Checkbox, FieldSet, Text, View } from "@react-pdf/renderer";
import { QuestionBooleanModel } from "survey-core";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";
import {
  pdfFormFieldProps,
  sanitizePdfFieldName,
  type PdfFormChrome,
} from "../pdf-form-field";

interface BooleanAnswerProps {
  question: QuestionBooleanModel;
  chrome: PdfFormChrome;
}

const PdfBooleanAnswer = ({ question, chrome }: BooleanAnswerProps) => {
  const trueLabel = pdfPlainText(question.locLabelTrue.text) || "Yes";
  const falseLabel = pdfPlainText(question.locLabelFalse.text) || "No";
  const value = question.value;
  const hasValue = value !== null && typeof value !== "undefined";
  const { checkboxBox, stack, row, answerText, positive, negative, mutedText } =
    chrome.themeStyles;

  if (!chrome.fillable) {
    if (!hasValue) {
      return <Text style={mutedText}>—</Text>;
    }
    return (
      <Text style={[answerText, value ? positive : negative]}>
        {(value ? trueLabel : falseLabel).toUpperCase()}
      </Text>
    );
  }

  const field = pdfFormFieldProps(chrome);

  return (
    <FieldSet name={sanitizePdfFieldName(question.name)}>
      <View style={stack}>
        <View style={row}>
          <Checkbox
            {...field}
            name="choice.true"
            checked={hasValue && Boolean(value)}
            style={checkboxBox}
          />
          <Text style={[answerText, positive]}>{trueLabel.toUpperCase()}</Text>
        </View>
        <View style={row}>
          <Checkbox
            {...field}
            name="choice.false"
            checked={hasValue && !value}
            style={checkboxBox}
          />
          <Text style={[answerText, negative]}>{falseLabel.toUpperCase()}</Text>
        </View>
      </View>
    </FieldSet>
  );
};

export default PdfBooleanAnswer;
