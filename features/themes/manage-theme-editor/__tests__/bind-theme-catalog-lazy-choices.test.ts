import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ThemeTabPlugin } from "survey-creator-core";
import { bindThemeCatalogLazyChoices } from "../bind-theme-catalog-lazy-choices";

const { mockLoadPage } = vi.hoisted(() => ({ mockLoadPage: vi.fn() }));

vi.mock("../load-theme-catalog-choice-page", () => ({
  DEFAULT_THEME_CHOICE: { value: "default", text: "Default" },
  loadThemeCatalogChoicePage: (...args: unknown[]) => mockLoadPage(...args),
}));

type Handler = (sender: unknown, options: unknown) => Promise<void> | void;

type ItemsSettings = { items: unknown[]; totalCount?: number };

const choice = (name: string) => ({ value: name, text: name });

const lazyLoadOptions = (
  skip: number,
  setItems: (...args: unknown[]) => void,
) => ({
  question: { name: "themeName" },
  skip,
  take: 25,
  setItems,
});

function createPlugin(availableThemes: string[]) {
  /** The plugin rebuilds this survey on every Themes tab activation. */
  const makeSurvey = () => {
    const handlers: Handler[] = [];
    const question = {
      name: "themeName",
      choicesLazyLoadEnabled: false,
      choicesLazyLoadPageSize: 0,
      searchEnabled: true,
      choices: [] as unknown[],
    };
    const survey = {
      getQuestionByName: (name: string) =>
        name === "themeName" ? question : undefined,
      runExpressions: vi.fn(),
      onChoicesLazyLoad: {
        add: (handler: Handler) => handlers.push(handler),
        remove: (handler: Handler) => {
          handlers.splice(handlers.indexOf(handler), 1);
        },
      },
    };
    return { survey, question, handlers };
  };

  let current = makeSurvey();
  const themeModel = { setTheme: vi.fn() };
  const plugin = {
    availableThemes,
    themeModel,
    addTheme: (theme: { themeName?: string }) => {
      const name = theme.themeName ?? "unnamed";
      plugin.availableThemes = [...plugin.availableThemes, name];
      const themeChooser = plugin.propertyGrid.survey.getQuestionByName(
        "themeName",
      ) as typeof current.question | undefined;
      if (themeChooser) {
        themeChooser.choices = plugin.availableThemes.map((themeName) => ({
          value: themeName,
          text: themeName,
        }));
        themeModel.setTheme({ themeName: "default" });
      }
      plugin.propertyGrid.survey.runExpressions();
    },
    propertyGrid: { survey: current.survey },
  };

  return {
    plugin: plugin as unknown as ThemeTabPlugin,
    get survey() {
      return current.survey;
    },
    get question() {
      return current.question as typeof current.question & {
        dropdownListModel?: unknown;
      };
    },
    get handlers() {
      return current.handlers;
    },
    /** Mirrors `propertyGrid.obj = themeModel` swapping in a fresh Model. */
    rebuildSurvey() {
      current = makeSurvey();
      plugin.propertyGrid.survey = current.survey;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadPage.mockResolvedValue({ items: [], hasNextPage: false });
});

describe("bindThemeCatalogLazyChoices", () => {
  it("seeds Default, enables lazy paging and hides the unsupported search box", () => {
    const { plugin, question } = createPlugin(["default", "contrast"]);

    bindThemeCatalogLazyChoices(plugin, vi.fn());

    expect(question.choicesLazyLoadEnabled).toBe(true);
    expect(question.choicesLazyLoadPageSize).toBe(25);
    expect(question.searchEnabled).toBe(false);
    expect(question.choices).toEqual([{ value: "default", text: "Default" }]);
  });

  it("loads a page on lazy load and registers the handler once per survey", async () => {
    const { plugin, handlers, question } = createPlugin(["default"]);
    const registerThemes = vi.fn();

    bindThemeCatalogLazyChoices(plugin, registerThemes);
    question.choices = [{ value: "Brand", text: "Brand" }];
    bindThemeCatalogLazyChoices(plugin, registerThemes);
    expect(handlers).toHaveLength(1);
    expect(question.choices).toEqual([{ value: "Brand", text: "Brand" }]);

    const setItems = vi.fn();
    mockLoadPage.mockResolvedValueOnce({
      items: [{ value: "default", text: "Default" }],
      hasNextPage: false,
    });
    await handlers[0](null, lazyLoadOptions(0, setItems));

    expect(mockLoadPage).toHaveBeenCalledWith(0, 25, registerThemes);
    expect(setItems).toHaveBeenCalledWith(
      [{ value: "default", text: "Default" }],
      1,
    );
  });

  it("binds a loading-row observer that does not fetch until the list is scrolled", () => {
    const { plugin, question } = createPlugin(["default"]);
    const disconnect = vi.fn();
    const initObserver = vi.fn();
    const setObserver = vi.fn();
    const updateQuestionChoices = vi.fn();
    const scrollableContainer = {
      scrollHeight: 800,
      scrollTop: 0,
      clientHeight: 240,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const popupModel = {
      isVisible: true,
      onVisibilityChanged: { add: vi.fn(), remove: vi.fn() },
    };
    question.dropdownListModel = {
      updateQuestionChoices,
      popupModel,
      listModel: {
        scrollableContainer,
        setLoadingIndicatorVisibilityObserver: setObserver,
        loadingIndicator: {
          intersectionVisibilityObserver: { disconnect },
          initLoadingIndicatorVisibilityObserver: initObserver,
        },
      },
    };

    bindThemeCatalogLazyChoices(plugin, vi.fn());

    expect(setObserver).toHaveBeenCalledWith(expect.any(Function));
    expect(initObserver).toHaveBeenCalledWith(expect.any(Function));

    initObserver.mock.calls[0][0](true);
    expect(updateQuestionChoices).not.toHaveBeenCalled();

    popupModel.isVisible = false;
    initObserver.mock.calls[0][0](true);
    expect(updateQuestionChoices).not.toHaveBeenCalled();

    popupModel.isVisible = true;
    scrollableContainer.scrollTop = 760;
    initObserver.mock.calls[0][0](true);
    expect(updateQuestionChoices).toHaveBeenCalledOnce();
  });

  it("reports the accumulated count on the last page so loading stops", async () => {
    const { plugin, handlers } = createPlugin(["default"]);
    bindThemeCatalogLazyChoices(plugin, vi.fn());

    const firstPage = Array.from({ length: 26 }, (_, i) => choice(`t${i}`));
    const setFirst = vi.fn();
    mockLoadPage.mockResolvedValueOnce({ items: firstPage, hasNextPage: true });
    await handlers[0](null, lazyLoadOptions(0, setFirst));
    // SurveyJS asks for the next page only while `skip + 1 < total`, and it has
    // already advanced skip to `take` by the time it reads the total.
    expect(setFirst.mock.calls[0][1]).toBeGreaterThan(25 + 1);

    const setLast = vi.fn();
    mockLoadPage.mockResolvedValueOnce({
      items: [choice("last")],
      hasNextPage: false,
    });
    await handlers[0](null, lazyLoadOptions(25, setLast));

    expect(setLast).toHaveBeenCalledWith([choice("last")], 27);
  });

  it("restarts the accumulated count when the list reloads from skip 0", async () => {
    const { plugin, handlers } = createPlugin(["default"]);
    bindThemeCatalogLazyChoices(plugin, vi.fn());

    mockLoadPage.mockResolvedValue({
      items: [choice("a"), choice("b")],
      hasNextPage: false,
    });
    const first = vi.fn();
    await handlers[0](null, lazyLoadOptions(0, first));
    const second = vi.fn();
    await handlers[0](null, lazyLoadOptions(0, second));

    expect(second.mock.calls[0][1]).toBe(2);
  });

  it("drops a stale page when the dropdown reopens at skip 0", async () => {
    const { plugin, handlers } = createPlugin(["default"]);
    bindThemeCatalogLazyChoices(plugin, vi.fn());

    let resolveFirst: (value: unknown) => void = () => {};
    mockLoadPage
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({
        items: [choice("fresh")],
        hasNextPage: false,
      });

    const staleSetItems = vi.fn();
    const staleLoad = handlers[0](null, lazyLoadOptions(0, staleSetItems));
    const freshSetItems = vi.fn();
    await handlers[0](null, lazyLoadOptions(0, freshSetItems));
    resolveFirst({ items: [choice("stale-page-2")], hasNextPage: false });
    await staleLoad;

    expect(staleSetItems).not.toHaveBeenCalled();
    expect(freshSetItems).toHaveBeenCalledWith([choice("fresh")], 1);
  });

  it("does not append a selected page-2 theme that SurveyJS already injected", async () => {
    const { plugin, handlers } = createPlugin(["default"]);
    bindThemeCatalogLazyChoices(plugin, vi.fn());

    const itemsSettings: ItemsSettings = {
      items: [choice("Tulip"), { value: "White", text: "White" }],
    };
    mockLoadPage.mockResolvedValueOnce({
      items: [choice("White"), choice("Corp Site")],
      hasNextPage: false,
      totalRecords: 27,
    });
    const question: {
      name: string;
      choices: unknown[];
      dropdownListModel: unknown;
    } = {
      name: "themeName",
      choices: [{ value: "White", text: "White" }],
      dropdownListModel: { itemsSettings },
    };
    const setItems = vi.fn((...args: unknown[]) => {
      itemsSettings.items = [...itemsSettings.items, ...(args[0] as unknown[])];
      question.choices = itemsSettings.items;
    });
    await handlers[0](null, {
      ...lazyLoadOptions(25, setItems),
      question,
    });

    expect(setItems).toHaveBeenCalledWith([choice("Corp Site")], 3);
    expect(itemsSettings.totalCount).toBe(3);
    expect(itemsSettings.items).toEqual([
      choice("Tulip"),
      { value: "White", text: "White" },
      choice("Corp Site"),
    ]);
  });

  it("clears SurveyJS concat buffer before applying skip 0", async () => {
    const { plugin, handlers } = createPlugin(["default"]);
    bindThemeCatalogLazyChoices(plugin, vi.fn());

    const itemsSettings: ItemsSettings = {
      items: [choice("White"), choice("Corp Site")],
    };
    mockLoadPage.mockResolvedValueOnce({
      items: [choice("default"), choice("Tulip")],
      hasNextPage: true,
      totalRecords: 40,
    });
    const setItems = vi.fn();
    await handlers[0](null, {
      ...lazyLoadOptions(0, setItems),
      question: { name: "themeName", dropdownListModel: { itemsSettings } },
    });

    expect(itemsSettings.items).toEqual([]);
    expect(setItems).toHaveBeenCalled();
  });

  it("does not let addTheme rewrite chooser choices while lazy load is on", () => {
    const { plugin, survey, question } = createPlugin(["default"]);
    const itemsSettings = { items: [choice("default")], totalCount: 40 };
    question.dropdownListModel = { itemsSettings };
    const originalAddTheme = plugin.addTheme;

    const unbind = bindThemeCatalogLazyChoices(plugin, vi.fn());
    plugin.addTheme({ themeName: "Brand" });
    expect(question.choices).toEqual([{ value: "default", text: "Default" }]);
    expect(itemsSettings).toEqual({
      items: [choice("default")],
      totalCount: 40,
    });
    expect(survey.runExpressions).toHaveBeenCalled();
    expect(plugin.themeModel.setTheme).not.toHaveBeenCalled();

    unbind();
    expect(plugin.addTheme).toBe(originalAddTheme);
    plugin.addTheme({ themeName: "Tulip" });
    expect(question.choices).toEqual([
      { value: "default", text: "default" },
      { value: "Brand", text: "Brand" },
      { value: "Tulip", text: "Tulip" },
    ]);
  });

  it("hands back the live unbind when the same survey binds twice", () => {
    const { plugin, handlers } = createPlugin(["default"]);

    const first = bindThemeCatalogLazyChoices(plugin, vi.fn());
    const second = bindThemeCatalogLazyChoices(plugin, vi.fn());

    expect(second).toBe(first);
    second();
    expect(handlers).toHaveLength(0);
  });

  it("supersedes the previous binding when the plugin rebuilds its survey", () => {
    // Every Themes tab activation swaps in a fresh property grid Model; without
    // superseding, each visit stacks another addTheme wrapper on the plugin.
    const harness = createPlugin(["default"]);
    const vendorAddTheme = harness.plugin.addTheme;

    bindThemeCatalogLazyChoices(harness.plugin, vi.fn());
    const staleHandlers = harness.handlers;

    harness.rebuildSurvey();
    const unbind = bindThemeCatalogLazyChoices(harness.plugin, vi.fn());

    expect(staleHandlers).toHaveLength(0);
    expect(harness.handlers).toHaveLength(1);

    unbind();
    expect(harness.plugin.addTheme).toBe(vendorAddTheme);
  });

  it("unbinds so a re-created creator can bind again", () => {
    const { plugin, handlers } = createPlugin(["default"]);

    const unbind = bindThemeCatalogLazyChoices(plugin, vi.fn());
    unbind();
    expect(handlers).toHaveLength(0);

    bindThemeCatalogLazyChoices(plugin, vi.fn());
    expect(handlers).toHaveLength(1);
  });
});
