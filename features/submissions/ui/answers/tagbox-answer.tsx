import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { ValueTooltip } from "./value-tooltip";
import { QuestionTagboxModel } from "survey-core";

interface TagBoxAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: QuestionTagboxModel;
}

interface TagDisplayItem {
  value: string | number;
  text: string;
}

function resolveTagDisplayItems(question: QuestionTagboxModel): TagDisplayItem[] {
  if (!Array.isArray(question?.value) || question.value.length === 0) {
    return [];
  }

  const selectedValues = question.value as Array<string | number>;

  return selectedValues.map((value) => {
    const selectedItem = question.selectedItems.find((item) => item?.value === value);
    let text = value.toString();

    if (selectedItem?.text) {
      text = selectedItem.text;
    }

    return {
      value,
      text,
    };
  });
}

const TagBoxAnswer = ({ question, className }: TagBoxAnswerProps) => {
  const [displayItems, setDisplayItems] = useState<TagDisplayItem[]>(() =>
    resolveTagDisplayItems(question),
  );

  useEffect(() => {
    const syncDisplayItems = () => {
      setDisplayItems(resolveTagDisplayItems(question));
    };

    question.onItemValuePropertyChanged.add(syncDisplayItems);

    return () => {
      question.onItemValuePropertyChanged.remove(syncDisplayItems);
    };
  }, [question]);

  if (displayItems.length === 0) {
    return <Minus className="h-4 w-4" />;
  }

  return (
    <div className={cn(className, "flex flex-row flex-wrap gap-2")}>
      {displayItems.map((item) => (
        <TagItem
          key={String(item.value)}
          item={item}
        />
      ))}
    </div>
  );
};

const TagItem = ({ item }: { item: TagDisplayItem }) => {
  return (
    <Badge
      variant="outline"
      className="flex flex-row items-center gap-2 text-sm font-medium"
    >
      {item.text}
      <ValueTooltip value={item.value} />
    </Badge>
  );
};

export default TagBoxAnswer;
