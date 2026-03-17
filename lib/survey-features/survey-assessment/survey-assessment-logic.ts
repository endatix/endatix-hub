export interface SurveyStats {
  uncompressedSize: number;
  totalQuestions: number;
  embeddedImagesCount: number;
  /** Total logic conditions (visible + invisible) from SurveyLogic. Set by plugin when creator survey is available. */
  logicConditionsCount: number;
  /** Number of hidden/invisible logic items from SurveyLogic. Set by plugin when creator survey is available. */
  invisibleLogicItemsCount: number;
  dropdownCount: number;
  totalDropdownChoicesCount: number;
  maxDropdownChoicesCount: number;
  fileUploadCount: number;
  fileUploadWithoutBlobCount: number;
  scanditCount: number;
}

export function analyzeSurvey(jsonData: string): SurveyStats {
  const stats: SurveyStats = {
    uncompressedSize: jsonData.length,
    totalQuestions: 0,
    embeddedImagesCount: 0,
    logicConditionsCount: 0,
    invisibleLogicItemsCount: 0,
    dropdownCount: 0,
    totalDropdownChoicesCount: 0,
    maxDropdownChoicesCount: 0,
    fileUploadCount: 0,
    fileUploadWithoutBlobCount: 0,
    scanditCount: 0,
  };

  if (!jsonData) return stats;

  const base64Matches = jsonData.match(/data:image\/[^;]+;base64,/g);
  if (base64Matches) {
    stats.embeddedImagesCount = base64Matches.length;
  }

  try {
    const survey = JSON.parse(jsonData);

    const traverseElements = (elements: any[]) => {
      if (!Array.isArray(elements)) return;

      elements.forEach((element) => {
        if (element.type === "panel" || element.type === "paneldynamic") {
          traverseElements(element.elements || element.templateElements);
          if (element.type === "paneldynamic") {
            stats.totalQuestions++;
          }
        } else if (
          element.type === "matrixdynamic" ||
          element.type === "matrixdropdown"
        ) {
          stats.totalQuestions++;
          if (element.columns && Array.isArray(element.columns)) {
            element.columns.forEach((col: any) => {
              if (col.cellType === "dropdown" || col.type === "dropdown") {
                stats.dropdownCount++;
                const choicesCount = (col.choices || []).length;
                stats.totalDropdownChoicesCount += choicesCount;
                stats.maxDropdownChoicesCount = Math.max(
                  stats.maxDropdownChoicesCount,
                  choicesCount,
                );
              }
            });
          }
        } else if (element.type) {
          stats.totalQuestions++;

          if (element.type === "dropdown") {
            stats.dropdownCount++;
            const choicesCount = (element.choices || []).length;
            stats.totalDropdownChoicesCount += choicesCount;
            stats.maxDropdownChoicesCount = Math.max(
              stats.maxDropdownChoicesCount,
              choicesCount,
            );
          }

          if (element.type === "file") {
            stats.fileUploadCount++;
            if (element.storeDataAsText !== false) {
              stats.fileUploadWithoutBlobCount++;
            }
          }

          if (element.type === "scandit") {
            stats.scanditCount++;
          }
        }

      });
    };

    if (survey.pages && Array.isArray(survey.pages)) {
      survey.pages.forEach((page: any) => {
        traverseElements(page.elements);
      });
    }
  } catch (error) {
    console.error("Failed to parse survey JSON for analysis", error);
  }

  return stats;
}
