/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { View, Image, Text, StyleSheet } from "@react-pdf/renderer";
import { QuestionSignaturePadModel } from "survey-core";

interface SignaturePadAnswerProps {
  question: QuestionSignaturePadModel;
}

export function PdfSignaturePadAnswer({
  question,
}: SignaturePadAnswerProps): React.ReactElement {
  const backgroundImage = question.backgroundImage;
  const signatureImage = question.value;
  return (
    <View style={styles.container} wrap={false}>
      {signatureImage ? (
        <View style={styles.signatureContainer} wrap={false}>
          {backgroundImage && (
            <View style={styles.imageWrapper}>
              <Image src={backgroundImage} style={styles.image} />
            </View>
          )}
          <View style={styles.imageWrapper}>
            <Image src={signatureImage} style={styles.image} />
          </View>
        </View>
      ) : (
        <Text style={styles.noFiles}>No signature provided</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 10,
    break: true,
  },
  title: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "bold",
  },
  noFiles: {
    fontSize: 12,
    color: "gray",
  },
  signatureContainer: {
    position: "relative",
    width: 350,
    height: 200,
    break: "avoid",
  },
  imageWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
});

export default PdfSignaturePadAnswer;
