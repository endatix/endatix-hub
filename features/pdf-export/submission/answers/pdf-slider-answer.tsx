import { Text } from "@react-pdf/renderer";
import { QuestionSliderModel } from "survey-core";
import { VIEWER_STYLES } from "../pdf-answer-viewer";

interface PdfSliderAnswerProps {
  question: QuestionSliderModel;
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

const PdfSliderAnswer = ({ question }: PdfSliderAnswerProps) => {
  const line = formatSliderValueLine(question);
  if (line === null) {
    return <Text style={VIEWER_STYLES.answerText}>No Answer</Text>;
  }

  return <Text style={VIEWER_STYLES.answerText}>{line}</Text>;
};

export default PdfSliderAnswer;
