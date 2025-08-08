import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { Question } from "survey-core";
import { GripVerticalIcon } from "@/features/pdf-export/submission/icons";

interface PdfRankingAnswerProps {
  question: Question;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: 2,
    marginBottom: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    fontSize: 10,
    marginBottom: 2,
  },
  noAnswer: {
    fontSize: 10,
    color: "#888",
    fontStyle: "italic",
  },
});

const PdfRankingAnswer = ({ question }: PdfRankingAnswerProps) => {
  const rankedAnswers: string[] = question.value ?? [];
  return (
    <View style={styles.container}>
      {rankedAnswers.length > 0 ? (
        rankedAnswers.map((answer) => (
          <View key={answer} style={styles.item}>
            <GripVerticalIcon />
            <Text>{answer}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.noAnswer}>No answer</Text>
      )}
    </View>
  );
};

export default PdfRankingAnswer;
