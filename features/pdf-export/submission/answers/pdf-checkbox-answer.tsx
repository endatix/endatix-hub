import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { ItemValue, QuestionCheckboxModel } from "survey-core";
import {
  formatChoiceDisplay,
  resolveChoiceLabel,
  resolveItemValueLabel,
} from "../format-choice-display";

interface CheckboxAnswerProps {
  question: QuestionCheckboxModel;
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  item: {
    display: "flex",
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    fontFamily: "Roboto",
  },
  checkedIndicator: {
    fontSize: 10,
    fontFamily: "Roboto-Bold",
  },
  title: {
    fontSize: 10,
    fontFamily: "Roboto-Bold",
    color: "gray",
    marginBottom: 4,
  },
});

const PdfCheckboxAnswer = ({ question }: CheckboxAnswerProps) => {
  const checkedItems: ItemValue[] = question.selectedChoices;

  if (!checkedItems || checkedItems.length === 0) {
    return <Text style={styles.title}>No items selected</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checked items</Text>
      {checkedItems.map((item) => (
        <View key={item.value} style={styles.item}>
          <Text style={styles.checkedIndicator}>[X]</Text>
          <Text style={styles.label}>
            {decodeURIComponent(
              formatChoiceDisplay(
                item.value,
                resolveChoiceLabel(question, item.value) ??
                  resolveItemValueLabel(item),
              ),
            )}
          </Text>
        </View>
      ))}
    </View>
  );
};

export default PdfCheckboxAnswer;
