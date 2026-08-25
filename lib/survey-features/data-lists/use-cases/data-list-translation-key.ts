export const DATA_LIST_TRANSLATION_KEY_PREFIX = "edx_dataList_";

const COMPOUND_KEY_PATTERN = /^edx_dataList_(\d+)_(.+)$/;

export interface DataListTranslationKey {
  dataListId: string;
  value: string;
}

export function encodeDataListTranslationKey(
  dataListId: string,
  value: string,
): string {
  return `${DATA_LIST_TRANSLATION_KEY_PREFIX}${dataListId}_${value}`;
}

export function parseDataListTranslationKey(
  key: string,
): DataListTranslationKey | null {
  const match = COMPOUND_KEY_PATTERN.exec(key.trim());
  if (!match) {
    return null;
  }

  return {
    dataListId: match[1],
    value: match[2],
  };
}
