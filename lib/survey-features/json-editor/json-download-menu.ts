import { ComputedUpdater, createDropdownActionModel } from "survey-core";
import type {
  SurveyCreatorModel,
  TabJsonEditorBasePlugin,
} from "survey-creator-core";
import { obfuscateSurveyJson } from "@/lib/survey-features/json-obfuscation/obfuscate-survey-json";
import { JSON_EDITOR_PLUGIN_NAME } from "./json-editor-state";

// Creator's JSON tab has one download button (svc-json-export, built in TabJsonEditorBasePlugin's
// createActions). The obfuscated download is SurveyJS's website addition, not Creator's, so this
// swaps the button for a menu. Re-check the action id on every SurveyJS upgrade (the tests fail).

const EXPORT_ACTION_ID = "svc-json-export";
const DEFAULT_FILE_NAME = "survey";
const PARSE_ERROR_MESSAGE =
  "Fix the JSON errors to download an obfuscated copy.";

/**
 * Replaces the JSON tab's download button with a menu: Download JSON (Creator's own) and Download
 * obfuscated JSON, saved as `<file name>.obf.json`. Returns how to put the stock button back.
 */
export function addObfuscatedJsonDownload(
  creator: SurveyCreatorModel,
  getFileName: () => string,
): () => void {
  const actions = creator.toolbar.actions;
  const stock = creator.toolbar.getActionById(EXPORT_ACTION_ID);
  if (!stock) return () => undefined;

  const menu = createDropdownActionModel(
    {
      id: EXPORT_ACTION_ID,
      iconName: stock.iconName,
      iconSize: stock.iconSize,
      title: stock.title,
      tooltip: stock.tooltip,
      mode: "small",
      visible: new ComputedUpdater<boolean>(
        () => creator.activeTab === JSON_EDITOR_PLUGIN_NAME,
      ) as unknown as boolean,
    },
    {
      items: [
        {
          id: `${EXPORT_ACTION_ID}-json`,
          title: "Download JSON",
          action: () => stock.action?.(),
        },
        {
          id: `${EXPORT_ACTION_ID}-obfuscated`,
          title: "Download obfuscated JSON",
          action: () => downloadObfuscated(creator, getFileName()),
        },
      ],
      allowSelection: false,
    },
  );
  actions.splice(actions.indexOf(stock), 1, menu);

  return () => {
    const index = actions.indexOf(menu);
    if (index >= 0) actions.splice(index, 1, stock);
  };
}

function downloadObfuscated(creator: SurveyCreatorModel, fileName: string) {
  const plugin: TabJsonEditorBasePlugin = creator.getPlugin(
    JSON_EDITOR_PLUGIN_NAME,
  );
  let json: object;
  try {
    json = JSON.parse(plugin.model?.text ?? creator.text);
  } catch {
    creator.notify(PARSE_ERROR_MESSAGE, "error");
    return;
  }
  const text = JSON.stringify(obfuscateSurveyJson(json), null, 2);
  plugin.saveToFileHandler(
    `${fileName || DEFAULT_FILE_NAME}.obf.json`,
    new Blob([text], { type: "application/json" }),
  );
}
