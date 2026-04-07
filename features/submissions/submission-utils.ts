import { Question } from "survey-core";

const MASK_CHAR = "•";
const MASK_LENGTH = 8;
const SENSITIVE_VARIABLE_NAMES_REGEX =
  /(?:secret|key|password|token|pass|hash|email|phone)/i;
const NO_NUMBER_VALUE = -1;

function isSensitiveVariableName(variableName: string): boolean {
  if (
    !variableName ||
    typeof variableName !== "string" ||
    variableName.length === 0
  ) {
    return false;
  }

  return SENSITIVE_VARIABLE_NAMES_REGEX.test(variableName);
}

function getMaskedValue(_value: string): string {
  return MASK_CHAR.repeat(MASK_LENGTH);
}

/**
 * Gets the number of a question.
 * @param question - The  question to get the number of.
 * @returns The number of the question, or NO_NUMBER_VALUE if the question has no number or has no showNumber property - https://surveyjs.io/form-library/documentation/api-reference/question#showNumber
 */
function getQuestionNumber(question?: Question): number {
  if (!question?.showNumber) {
    return NO_NUMBER_VALUE;
  }

  const numberText = question.no;
  if (numberText === undefined || numberText?.length === 0) {
    return NO_NUMBER_VALUE;
  }

  const number = Number.parseInt(numberText);
  if (Number.isNaN(number)) {
    return NO_NUMBER_VALUE;
  }

  return number;
}

export { getMaskedValue, getQuestionNumber, isSensitiveVariableName };

