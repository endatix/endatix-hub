import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ThemeTabPlugin } from "survey-creator-core";
import { bindThemeCatalogLazyChoices } from "../bind-theme-catalog-lazy-choices";

const { mockLoadPage } = vi.hoisted(() => ({ mockLoadPage: vi.fn() }));

vi.mock("../load-theme-catalog-choice-page", () => ({
  DEFAULT_THEME_CHOICE: { value: "default", text: "Default" },
  loadThemeCatalogChoicePage: (...args: unknown[]) => mockLoadPage(...args),
}));

type Handler = (sender: unknown, options: unknown) => Promise<void> | void;

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
    onChoicesLazyLoad: {
      add: (handler: Handler) => handlers.push(handler),
      remove: (handler: Handler) => {
        handlers.splice(handlers.indexOf(handler), 1);
      },
    },
  };
  const plugin = {
    availableThemes,
    propertyGrid: { survey },
  };

  return { plugin: plugin as unknown as ThemeTabPlugin, question, handlers };
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
    const { plugin, handlers } = createPlugin(["default"]);
    const registerThemes = vi.fn();

    bindThemeCatalogLazyChoices(plugin, registerThemes);
    bindThemeCatalogLazyChoices(plugin, registerThemes);
    expect(handlers).toHaveLength(1);

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

  it("unbinds so a re-created creator can bind again", () => {
    const { plugin, handlers } = createPlugin(["default"]);

    const unbind = bindThemeCatalogLazyChoices(plugin, vi.fn());
    unbind();
    expect(handlers).toHaveLength(0);

    bindThemeCatalogLazyChoices(plugin, vi.fn());
    expect(handlers).toHaveLength(1);
  });
});
