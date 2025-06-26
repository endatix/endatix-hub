import { Result } from "@/lib/result";

interface TextPreProcessorItem {
  start: number;
  end: number;
}

interface Token {
  value: string;
  isVariable: boolean;
  replacedValue?: string;
}

function isValidItemName(name: string): boolean {
  return name.length > 0 && name.length < 100;
}

/**
 * Get the replaced items from the text
 * @param text - The text to get the replaced items from. Follows the logic of the textPreProcessor.ts file in the survey-library.
 * @returns The replaced items
 */
function getReplacedItems(text: string): TextPreProcessorItem[] {
  const replacedItems: TextPreProcessorItem[] = [];
  const length = text.length;
  let start = -1;
  let ch = "";
  for (let i = 0; i < length; i++) {
    ch = text[i];
    if (ch == "{") start = i;
    if (ch == "}") {
      if (start > -1) {
        const item: TextPreProcessorItem = {
          start,
          end: i,
        };
        if (isValidItemName(text.substring(start + 1, i - 1))) {
          replacedItems.push(item);
        }
      }
      start = -1;
    }
  }
  return replacedItems;
}

/**
 * Extract the tokens from the original text marking which are static and which are variables
 * @param originalText - The original text
 * @returns The tokens
 */
function extractTokensFromOriginal(originalText: string): Token[] {
  const tokens: Token[] = [];
  const replacedItems = getReplacedItems(originalText);

  for (let i = 0; i < replacedItems.length; i++) {
    const item = replacedItems[i];
    // Add text before this variable (if not first item)
    if (i === 0) {
      const textBefore = originalText.substring(0, item.start);
      if (textBefore.length > 0) {
        tokens.push({ value: textBefore, isVariable: false });
      }
    } else {
      const previousItem = replacedItems[i - 1];
      const textBetween = originalText.substring(
        previousItem.end + 1,
        item.start,
      );
      if (textBetween.length > 0) {
        tokens.push({ value: textBetween, isVariable: false });
      } else {
        // Merge adjacent variables: extend the last token's value
        const lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.isVariable) {
          lastToken.value += originalText.substring(item.start + 1, item.end);
          continue;
        }
      }
    }
    // Add the variable token
    tokens.push({
      value: originalText.substring(item.start + 1, item.end),
      isVariable: true,
    });
  }
  if (replacedItems.length > 0) {
    const lastItem = replacedItems[replacedItems.length - 1];
    const textAfter = originalText.substring(lastItem.end + 1);
    if (textAfter.length > 0) {
      tokens.push({ value: textAfter, isVariable: false });
    }
  }
  return tokens;
}

/**
 * Map the processed text to the tokens
 * @param tokens - The tokens to map the processed text to
 * @param processedText - The processed text
 * @returns The mapped tokens
 */
function mapProcessedTextToTokens(
  tokens: Token[],
  processedText: string,
): Result<Token[]> {
  let remainingProcessedText = processedText;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.isVariable) {
      if (!remainingProcessedText.startsWith(token.value)) {
        return Result.error("Static text mismatch in processed text");
      }
      remainingProcessedText = remainingProcessedText.substring(
        token.value.length,
      );
    } else {
      if (i === tokens.length - 1) {
        token.replacedValue = remainingProcessedText;
      } else {
        const nextStaticToken = tokens.slice(i + 1).find((t) => !t.isVariable);
        if (nextStaticToken) {
          const nextTextIndex = remainingProcessedText.indexOf(
            nextStaticToken.value,
          );
          if (nextTextIndex === -1) {
            return Result.error(
              "Cannot find next static text in processed text",
            );
          }
          token.replacedValue = remainingProcessedText.substring(
            0,
            nextTextIndex,
          );
          remainingProcessedText =
            remainingProcessedText.substring(nextTextIndex);
        } else {
          token.replacedValue = remainingProcessedText;
        }
      }
    }
  }
  return Result.success(tokens);
}

/**
 * Extract the replaced tokens from the original text
 * @param originalText - The original text
 * @param processedText - The processed text
 * @returns The replaced tokens
 */
function extractReplacedTokens(
  originalText: string,
  processedText: string,
): Result<Token[]> {
  if (originalText === processedText) {
    return Result.validationError("No personalized tokens found");
  }
  const tokens = extractTokensFromOriginal(originalText);
  return mapProcessedTextToTokens(tokens, processedText);
}

export { extractReplacedTokens, isValidItemName, getReplacedItems };
export type { Token, TextPreProcessorItem };
