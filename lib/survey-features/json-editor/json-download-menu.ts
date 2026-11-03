import {
  ComputedUpdater,
  SvgRegistry,
  createDropdownActionModel,
  type Action,
} from "survey-core";
import type {
  ActiveTabChangedEvent,
  SurveyCreatorModel,
  TabJsonEditorBasePlugin,
} from "survey-creator-core";
import { obfuscateSurveyJson } from "./use-cases/obfuscate-survey-json";
import { JSON_EDITOR_PLUGIN_NAME } from "./json-editor-state";

// Creator builds the JSON tab's download button, svc-json-export, in
// TabJsonEditorBasePlugin's createActions.

const EXPORT_ACTION_ID = "svc-json-export";
const DEFAULT_FILE_NAME = "survey";
const OBFUSCATED_ICON = "icon-download-obfuscated";
// Lucide's shield with a down arrow, drawn at Creator's 1.5 line weight.
const OBFUSCATED_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>' +
  '<path d="M12 8v7"/><path d="m9 12 3 3 3-3"/></svg>';

SvgRegistry.registerIcon(OBFUSCATED_ICON, OBFUSCATED_ICON_SVG);
const OBFUSCATE_ERROR_MESSAGE =
  "Fix the JSON errors to download an obfuscated copy.";

type Swap = { stock: Action; menu: Action };

/**
 * Replaces the JSON tab's download button with a menu: Download JSON (Creator's own) and Download
 * obfuscated JSON, saved as `<file name>.obf.json`. In the app the button lands on the toolbar after
 * the Creator is built, so it also swaps each time the JSON tab opens. Returns how to put the stock
 * button back.
 */
export function addObfuscatedJsonDownload(
  creator: SurveyCreatorModel,
  getFileName: () => string,
): () => void {
  const actions = creator.toolbar.actions;
  let swap: Swap | undefined;

  const swapIn = () => {
    const current = creator.toolbar.getActionById(EXPORT_ACTION_ID);
    if (!current || current === swap?.menu) return;
    const menu = createMenu(creator, current, getFileName);
    actions.splice(actions.indexOf(current), 1, menu);
    swap = { stock: current, menu };
  };
  const onTabChanged = (
    _sender: SurveyCreatorModel,
    options: ActiveTabChangedEvent,
  ) => {
    if (options.tabName === JSON_EDITOR_PLUGIN_NAME) swapIn();
  };

  swapIn();
  creator.onActiveTabChanged.add(onTabChanged);

  return () => {
    creator.onActiveTabChanged.remove(onTabChanged);
    if (!swap) return;
    const index = actions.indexOf(swap.menu);
    if (index >= 0) actions.splice(index, 1, swap.stock);
    swap.menu.dispose();
  };
}

function createMenu(
  creator: SurveyCreatorModel,
  stock: Action,
  getFileName: () => string,
): Action {
  return createDropdownActionModel(
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
          iconName: stock.iconName,
          iconSize: stock.iconSize,
          action: () => stock.action?.(),
        },
        {
          id: `${EXPORT_ACTION_ID}-obfuscated`,
          title: "Download obfuscated JSON",
          iconName: OBFUSCATED_ICON,
          iconSize: stock.iconSize,
          action: () => downloadObfuscated(creator, getFileName()),
        },
      ],
      allowSelection: false,
    },
  );
}

function downloadObfuscated(creator: SurveyCreatorModel, fileName: string) {
  const plugin: TabJsonEditorBasePlugin = creator.getPlugin(
    JSON_EDITOR_PLUGIN_NAME,
  );
  let text: string;
  try {
    const json = JSON.parse(plugin.model?.text ?? creator.text);
    text = JSON.stringify(obfuscateSurveyJson(json), null, 2);
  } catch {
    creator.notify(OBFUSCATE_ERROR_MESSAGE, "error");
    return;
  }
  plugin.saveToFileHandler(
    `${fileName || DEFAULT_FILE_NAME}.obf.json`,
    new Blob([text], { type: "application/json" }),
  );
}
