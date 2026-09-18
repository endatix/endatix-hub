import { Submission } from "@/lib/endatix-api";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { PdfThemeStyles } from "@/features/pdf-export/create-pdf-theme-styles";
import { PDF_STYLES } from "./pdf-styles";
import {
  getElapsedTimeString,
  getFormattedDate,
  getSubmissionStartedAt,
} from "@/lib/utils";

interface PdfSubmissionPropertiesProps {
  submission: Submission;
  themeStyles: PdfThemeStyles;
}

const DASH_NO_DATA = "—";

export const PdfSubmissionProperties = ({
  submission,
  themeStyles,
}: PdfSubmissionPropertiesProps) => {

  return (
    <View style={[PDF_STYLES.section, themeStyles.propertiesSection]}>
      <Text style={themeStyles.sectionTitle}>Submission Properties</Text>
      <View style={styles.propertiesTable}>
        <View style={styles.propertyRow}>
          <Text style={themeStyles.propertyLabel}>ID:</Text>
          <Text style={themeStyles.propertyValue}>{submission.id}</Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={themeStyles.propertyLabel}>Is Complete?</Text>
          <Text style={themeStyles.propertyValue}>
            {submission.isComplete ? "YES" : "NO"}
          </Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={themeStyles.propertyLabel}>Created at</Text>
          <Text style={themeStyles.propertyValue}>
            {getFormattedDate(submission.createdAt)}
          </Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={themeStyles.propertyLabel}>Last modified on</Text>
          <Text style={themeStyles.propertyValue}>
            {getFormattedDate(submission.modifiedAt)}
          </Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={themeStyles.propertyLabel}>Started at</Text>
          <Text style={themeStyles.propertyValue}>
            {getFormattedDate(submission.startedAt, DASH_NO_DATA)}
          </Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={themeStyles.propertyLabel}>Completed at</Text>
          <Text style={themeStyles.propertyValue}>
            {submission.isComplete
              ? getFormattedDate(submission.completedAt)
              : DASH_NO_DATA}
          </Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={themeStyles.propertyLabel}>Completion time</Text>
          <Text style={themeStyles.propertyValue}>
            {submission.isComplete
              ? getElapsedTimeString(
                  getSubmissionStartedAt(submission),
                  submission.completedAt,
                  "long",
                )
              : DASH_NO_DATA}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  propertiesTable: {
    marginTop: 8,
    width: "100%",
  },
  propertyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
});
