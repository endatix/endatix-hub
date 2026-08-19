import { toast } from "@/components/ui/toast";
import { getDataListTranslationCatalogAction } from "@/features/data-lists/translations/get-data-list-translation-catalog.action";
import { uploadTranslationsCsvAction } from "@/features/data-lists/translations/translations-csv.action";
import { Result } from "@/lib/result";
import { DATA_LIST_PROPERTY_NAME } from "@/lib/survey-features/data-lists/constants";
import { collectBoundDataListIds } from "@/lib/survey-features/data-lists/use-cases/collect-bound-data-list-ids";
import { createDataListTranslationCsvHooks } from "@/lib/survey-features/data-lists/use-cases/creator-translation-csv-hooks";
import type {
  DataListTranslationCatalog,
  GroupedDataListCsv,
} from "@/lib/survey-features/data-lists/use-cases/surveyjs-translation-csv";
import type {
  AfterPropertyChangedEvent,
  SurveyCreatorModel,
} from "survey-creator-core";

const WRAPPED_MODEL_KEY = "__endatixDataListTranslationCsvWrapped";
const TRANSLATION_TAB_NAME = "translation";

type TranslationCsvModel = {
  exportToCSV: () => string;
  importFromNestedArray: (rows: string[][]) => void;
} & Record<string, unknown>;

type TranslationTabPlugin = {
  model?: TranslationCsvModel;
};

export function bindDataListCreatorTranslations(
  creator: SurveyCreatorModel,
): () => void {
  const catalogs = new Map<string, DataListTranslationCatalog>();
  const hooks = createDataListTranslationCsvHooks({
    getCatalogs: () => [...catalogs.values()],
    persistCsvs: (csvs) => {
      void persistDataListTranslationCsvs(csvs);
    },
  });

  const wrapActiveTranslationModel = (): void => {
    const model = getTranslationCsvModel(creator);
    if (!model || model[WRAPPED_MODEL_KEY]) {
      return;
    }

    model[WRAPPED_MODEL_KEY] = true;
    const originalExport = model.exportToCSV.bind(model);
    const originalImport = model.importFromNestedArray.bind(model);
    model.exportToCSV = hooks.wrapExportToCsv(originalExport);
    model.importFromNestedArray = hooks.wrapImportFromNestedArray(
      originalImport,
    );
  };

  const hydrateBoundCatalogs = (): void => {
    const ids = collectBoundDataListIds(creator.survey);
    void Promise.all(
      ids.map(async (dataListId) => {
        if (catalogs.has(dataListId)) {
          return;
        }

        const result = await getDataListTranslationCatalogAction(dataListId);
        if (Result.isError(result)) {
          toast.error(result.message);
          return;
        }

        catalogs.set(dataListId, result.value);
      }),
    );
  };

  const onActiveTabChanged = (): void => {
    if (creator.activeTab !== TRANSLATION_TAB_NAME) {
      return;
    }

    wrapActiveTranslationModel();
    hydrateBoundCatalogs();
  };

  const onPropertyChanged = (
    _: SurveyCreatorModel,
    options: AfterPropertyChangedEvent,
  ): void => {
    if (options.propertyName !== DATA_LIST_PROPERTY_NAME) {
      return;
    }

    if (creator.activeTab !== TRANSLATION_TAB_NAME) {
      return;
    }

    hydrateBoundCatalogs();
  };

  creator.onActiveTabChanged.add(onActiveTabChanged);
  creator.onAfterPropertyChanged.add(onPropertyChanged);
  if (creator.activeTab === TRANSLATION_TAB_NAME) {
    onActiveTabChanged();
  }

  return () => {
    creator.onActiveTabChanged.remove(onActiveTabChanged);
    creator.onAfterPropertyChanged.remove(onPropertyChanged);
  };
}

function getTranslationCsvModel(
  creator: SurveyCreatorModel,
): TranslationCsvModel | null {
  const plugin = creator.getPlugin(
    TRANSLATION_TAB_NAME,
  ) as TranslationTabPlugin | undefined;
  return plugin?.model ?? null;
}

async function persistDataListTranslationCsvs(
  csvs: readonly GroupedDataListCsv[],
): Promise<void> {
  const results = await Promise.all(
    csvs.map((entry) =>
      uploadTranslationsCsvAction({
        dataListId: entry.dataListId,
        csv: entry.csv,
      }),
    ),
  );
  const failed = results.find((result) => Result.isError(result));
  if (failed && Result.isError(failed)) {
    toast.error(failed.message);
    return;
  }

  toast.success("Data list translations updated.");
}
