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

interface PdfCalculatedValue {
  name: string;
  value: unknown;
  expression: string;
  includeIntoResult: boolean;
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
  const calculatedValues = (surveyModel.calculatedValues ?? []).map((item) => ({
    name: item.name ?? "",
    value: surveyModel.getValue(item.name ?? ""),
    expression: item.expression ?? "",
    includeIntoResult: Boolean(item.includeIntoResult),
  })) as PdfCalculatedValue[];
  const hasCalculatedValues = calculatedValues.length > 0;

  if (!hasVariables && !hasCalculatedValues) {
    return null;
  }

  return (
    <View style={styles.sectionsContainer}>
      {hasVariables && (
        <View style={styles.dynamicVariablesSection}>
          <View style={PDF_STYLES.flexRow}>
            <UserRoundSearchIcon />
            <Text style={styles.dynamicVariablesTitle}>Dynamic Variables</Text>
          </View>
          <View style={styles.dynamicVariablesList}>
            {dynamicVariableNames.map((name) => (
              <View key={name} style={styles.dynamicVariableRow}>
                <View style={styles.calculatedNameRow}>
                  <Text style={styles.dynamicVariableName}>{`@${name} =`}</Text>
                  <Text
                    style={styles.dynamicVariableValue}
                  >{` ${surveyModel.getVariable(name)}`}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
      {hasCalculatedValues && (
        <View style={styles.dynamicVariablesSection}>
          <View style={PDF_STYLES.flexRow}>
            <Text style={styles.dynamicVariablesTitle}>Calculated Values</Text>
          </View>
          <View style={styles.dynamicVariablesList}>
            {calculatedValues.map((item) => (
              <View key={item.name} style={styles.dynamicVariableRow}>
                <View style={styles.calculatedNameRow}>
                  <Text
                    style={styles.dynamicVariableName}
                  >{`${item.name} =`}</Text>
                  <Text
                    style={styles.dynamicVariableValue}
                  >{` ${item.value ?? ""}`}</Text>
                </View>
                <Text style={styles.calculatedMeta}>
                  {`includeIntoResult: ${item.includeIntoResult ? "true" : "false"}`}
                </Text>
                <Text style={styles.calculatedExpression}>
                  {`expression: ${item.expression || "-"}`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionsContainer: {
    marginBottom: 12,
    gap: 8,
  },
  dynamicVariablesSection: {
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
    flexDirection: "column",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 2,
    backgroundColor: "#fff",
  },
  calculatedNameRow: {
    flexDirection: "row",
    alignItems: "center",
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
  calculatedMeta: {
    marginTop: 2,
    fontSize: 9,
    color: "#555",
  },
  calculatedExpression: {
    marginTop: 1,
    fontSize: 9,
    color: "#555",
  },
});
