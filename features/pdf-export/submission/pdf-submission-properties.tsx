import { Submission } from "@/lib/endatix-api";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { currentPdfStyles } from "@/features/pdf-export/theme/pdf-theme-context";
import { PROPERTIES_PAPER } from "./pdf-styles";
import {
  getElapsedTimeString,
  getFormattedDate,
  getSubmissionStartedAt,
} from "@/lib/utils";

interface PdfSubmissionPropertiesProps {
  submission: Submission;
}

const DASH_NO_DATA = "—";

export const PdfSubmissionProperties = ({
  submission,
}: PdfSubmissionPropertiesProps) => {
  const { body, panel, properties } = currentPdfStyles();
  return (
    <View style={[body.section, styles.sectionProperties, panel]}>
      <Text style={[body.sectionTitle, properties.title]}>Submission Properties</Text>
      <View style={styles.propertiesTable}>
        <Property label="ID:">{submission.id}</Property>
        <Property label="Is Complete?">
          {submission.isComplete ? "YES" : "NO"}
        </Property>
        <Property label="Created at">
          {getFormattedDate(submission.createdAt)}
        </Property>
        <Property label="Last modified on">
          {getFormattedDate(submission.modifiedAt)}
        </Property>
        <Property label="Started at">
          {getFormattedDate(submission.startedAt, DASH_NO_DATA)}
        </Property>
        <Property label="Completed at">
          {submission.isComplete
            ? getFormattedDate(submission.completedAt)
            : DASH_NO_DATA}
        </Property>
        <Property label="Completion time">
          {submission.isComplete
            ? getElapsedTimeString(
                getSubmissionStartedAt(submission),
                submission.completedAt,
                "long",
              )
            : DASH_NO_DATA}
        </Property>
      </View>
    </View>
  );
};

function Property({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  const { properties } = currentPdfStyles();
  return (
    <View style={styles.propertyRow}>
      <Text style={[styles.propertyLabel, properties.label]}>{label}</Text>
      <Text style={[styles.propertyValue, properties.value]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionProperties: {
    fontSize: 10,
    backgroundColor: PROPERTIES_PAPER,
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
    fontSize: 10,
    paddingRight: 16,
  },
  propertyValue: {
    flex: 3,
    textAlign: "left",
    fontFamily: "Roboto",
    fontSize: 10,
  },
});
