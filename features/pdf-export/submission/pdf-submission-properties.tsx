import { Submission } from "@/lib/endatix-api";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PDF_STYLES } from "./pdf-styles";
import { getElapsedTimeString, getFormattedDate } from "@/lib/utils";

interface PdfSubmissionPropertiesProps {
  submission: Submission;
}

export const PdfSubmissionProperties = ({
  submission,
}: PdfSubmissionPropertiesProps) => {
  return (
    <View style={[PDF_STYLES.section, styles.sectionProperties]}>
      <Text style={PDF_STYLES.sectionTitle}>Submission Properties</Text>
      <View style={styles.propertiesTable}>
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>ID:</Text>
          <Text style={styles.propertyValue}>{submission.id}</Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>Is Complete?</Text>
          <Text style={styles.propertyValue}>
            {submission.isComplete ? "YES" : "NO"}
          </Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>Created at</Text>
          <Text style={styles.propertyValue}>
            {getFormattedDate(submission.createdAt)}
          </Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>Completed at</Text>
          <Text style={styles.propertyValue}>
            {getFormattedDate(submission.completedAt)}
          </Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>Completion time</Text>
          <Text style={styles.propertyValue}>
            {getElapsedTimeString(
              submission.createdAt,
              submission.completedAt,
              "long",
            )}
          </Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>Last modified on</Text>
          <Text style={styles.propertyValue}>
            {getFormattedDate(submission.modifiedAt)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionProperties: {
    fontSize: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    gap: 4,
  },
  propertiesTable: {
    marginTop: 8,
    width: "100%",
  },
  propertyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  propertyLabel: {
    flex: 2,
    textAlign: "right",
    fontFamily: "Roboto-Bold",
    color: "#666",
    fontSize: 10,
    paddingRight: 16,
  },
  propertyValue: {
    flex: 3,
    textAlign: "left",
    fontFamily: "Roboto",
    color: "#222",
    fontSize: 10,
  },
});
