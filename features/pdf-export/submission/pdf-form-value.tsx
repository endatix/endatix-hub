import { FieldSet, Text, TextInput } from "@react-pdf/renderer";
import {
  pdfFormFieldProps,
  sanitizePdfFieldName,
  type PdfFormChrome,
} from "./pdf-form-field";

interface PdfFormValueProps {
  chrome: PdfFormChrome;
  name: string;
  value: string;
  multiline?: boolean;
}

/** Brochure PDF: Text. Fillable PDF: AcroForm TextInput. */
export function PdfFormValue({
  chrome,
  name,
  value,
  multiline,
}: PdfFormValueProps) {
  if (!chrome.fillable) {
    return (
      <Text style={chrome.themeStyles.answerText}>{value.trim() ? value : "—"}</Text>
    );
  }

  return (
    <FieldSet name={sanitizePdfFieldName(name)}>
      <TextInput
        {...pdfFormFieldProps(chrome)}
        name="value"
        multiline={multiline}
        value={value}
        style={multiline ? chrome.themeStyles.formList : chrome.themeStyles.formInput}
      />
    </FieldSet>
  );
}
