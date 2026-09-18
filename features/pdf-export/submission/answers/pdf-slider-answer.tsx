import { Text, TextInput } from "@react-pdf/renderer";
import { QuestionSliderModel } from "survey-core";
import type { PdfFormChrome } from "../pdf-form-field";
import { pdfFormFieldProps, sanitizePdfFieldName } from "../pdf-form-field";

interface PdfSliderAnswerProps {
  question: QuestionSliderModel;
  chrome: PdfFormChrome;
}

function formatSliderValueLine(question: QuestionSliderModel): string | null {
  const { min, max, sliderType, value: raw } = question;

  if (sliderType === "range") {
    if (!Array.isArray(raw) || raw.length < 2) {
      return null;
    }
    return `${raw[0]} – ${raw[1]} (scale ${min}–${max})`;
  }

  if (raw === undefined || raw === null || raw === "") {
    return null;
  }

  const n = Array.isArray(raw) ? raw[0] : raw;
  if (typeof n !== "number" && typeof n !== "string") {
    return null;
  }
  const num = Number(n);
  if (Number.isNaN(num)) {
    return null;
  }

  return `${num} (scale ${min}–${max})`;
}

const PdfSliderAnswer = ({ question, chrome }: PdfSliderAnswerProps) => {
  const line = formatSliderValueLine(question);
  if (line === null) {
    return <Text style={chrome.themeStyles.mutedText}>No Answer</Text>;
  }

  if (!chrome.fillable) {
    return <Text style={chrome.themeStyles.answerText}>{line}</Text>;
  }

  return (
    <TextInput
      {...pdfFormFieldProps(chrome)}
      name={sanitizePdfFieldName(question.name)}
      value={line}
      style={chrome.themeStyles.formInput}
    />
  );
};

export default PdfSliderAnswer;
