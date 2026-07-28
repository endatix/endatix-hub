/* eslint-disable jsx-a11y/alt-text */
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";
import type { Question } from "survey-core";
import { resolveAnswerZones } from "./utils";

interface PdfDragCategorizeAnswerProps {
  question: Question;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: 6,
    marginBottom: 4,
  },
  zone: {
    flexDirection: "column",
    gap: 2,
  },
  zoneTitle: {
    fontFamily: "Roboto-Bold",
    fontSize: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    fontSize: 10,
    marginLeft: 8,
  },
  itemImage: {
    width: 24,
    height: 24,
    objectFit: "contain",
  },
  empty: {
    fontSize: 10,
    color: "#888",
    marginLeft: 8,
  },
});

/**
 * PDF rendering of a drag-categorize answer: each zone followed by the
 * items placed in it. Reads the raw question shape so it does not depend
 * on the question class being registered in the export process.
 *
 * Zone and item resolution is shared with the submission viewer so the two
 * cannot disagree about what an answer looks like.
 */
export const PdfDragCategorizeAnswer = ({
  question,
}: PdfDragCategorizeAnswerProps): React.ReactElement => {
  const zones = resolveAnswerZones(question);

  if (zones.length === 0) {
    return <Text style={styles.empty}>No answer</Text>;
  }

  return (
    <View style={styles.container}>
      {zones.map((zone) => (
        <View key={zone.value} style={styles.zone} wrap={false}>
          <Text style={styles.zoneTitle}>{zone.title}</Text>
          {zone.items.length === 0 ? (
            <Text style={styles.empty}>No items</Text>
          ) : (
            zone.items.map((item) => (
              <View key={item.value} style={styles.item}>
                {item.imageUrl && (
                  <Image src={item.imageUrl} style={styles.itemImage} />
                )}
                {item.text !== "" && <Text>{item.text}</Text>}
              </View>
            ))
          )}
        </View>
      ))}
    </View>
  );
};

export default PdfDragCategorizeAnswer;
