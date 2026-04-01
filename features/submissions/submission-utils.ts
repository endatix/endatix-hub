const MASK_CHAR = "•";
const MASK_LENGTH = 8;
const SENSITIVE_VARIABLE_NAMES_REGEX =
  /(?:secret|key|password|token|pass|hash|email|phone)/i;

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

export { getMaskedValue, isSensitiveVariableName };
