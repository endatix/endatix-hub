import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { UserRoundSearchIcon } from "./icons";
import { PDF_STYLES } from "./pdf-styles";
import { Model } from "survey-core";
import {
  DynamicVariables,
  Metadata,
  MetadataSchema,
} from "@/features/public-form/types";
import { tryParseJson } from "@/lib/utils/type-parsers";
import { Result } from "@/lib/result";

interface PdfSubmissionVariablesProps {
  surveyModel: Model;
  stringifiedMetadata: string;
}

export const PdfSubmissionVariables = ({
  surveyModel,
  stringifiedMetadata,
}: PdfSubmissionVariablesProps) => {
  let dynamicVariables: DynamicVariables = {};
  const parseResult = tryParseJson<Metadata>(stringifiedMetadata);
  let parsedMetadata: Metadata = {};
  if (Result.isError(parseResult)) {
    console.warn(
      "Error while parsing submission's metadata",
      parseResult.message,
    );
  } else {
    parsedMetadata = parseResult.value;
  }

  const metadataResult = MetadataSchema.safeParse(parsedMetadata);
  if (!metadataResult.success) {
    console.warn("Invalid initial variables:", metadataResult.error);
  } else {
    dynamicVariables = metadataResult.data?.variables || {};
  }

  Object.entries(dynamicVariables).forEach(([key, value]) => {
    surveyModel.setVariable(key, value);
  });

  const dynamicVariableNames = surveyModel.getVariableNames?.() ?? [];
  const hasVariables = dynamicVariableNames.length > 0;

  if (!hasVariables) {
    return null;
  }

  return (
    <View style={styles.dynamicVariablesSection}>
      <View style={PDF_STYLES.flexRow}>
        <UserRoundSearchIcon />
        <Text style={styles.dynamicVariablesTitle}>Dynamic Variables</Text>
      </View>
      <View style={styles.dynamicVariablesList}>
        {dynamicVariableNames.map((name) => (
          <View key={name} style={styles.dynamicVariableRow}>
            <Text style={styles.dynamicVariableName}>{`@${name} =`}</Text>
            <Text
              style={styles.dynamicVariableValue}
            >{` ${surveyModel.getVariable(name)}`}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dynamicVariablesSection: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
  },
  dynamicVariablesTitle: {
    fontSize: 11,
    fontFamily: "Roboto-Bold",
    marginBottom: 4,
  },
  dynamicVariablesList: {
    marginTop: 2,
    gap: 2,
  },
  dynamicVariableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 2,
    backgroundColor: "#fff",
  },
  dynamicVariableName: {
    fontSize: 10,
    color: "#666",
    marginRight: 2,
  },
  dynamicVariableValue: {
    fontSize: 10,
    color: "#222",
  },
});
