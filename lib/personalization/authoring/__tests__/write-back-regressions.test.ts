import { describe, expect, it, vi } from "vitest";
import type { Action } from "survey-core";
import type { SurveyCreatorModel, TabTestPlugin } from "survey-creator-core";
import {
  AudienceIdentifierKind,
  type AudienceVariablePreset,
  type AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { bindAudienceToCreator, type PreviewAs } from "..";
import {
  ANA,
  applyEdit,
  BOB,
  designer,
  flush,
  MARIA,
  operations,
  type Save,
  tierOf,
  variables,
  withTier,
} from "./write-back-fixtures";

const FIND_ID = "endatix-find-participant";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** The first 20 of 60: Maria (test) and Bob (real), Maria's tier as given. */
function firstPage(mariaTier = "gold", extra: AudienceVariablePreset[] = []) {
  const read = variables([
    { name: MARIA, variables: { tier: mariaTier } },
    { name: BOB, variables: { tier: "silver" } },
    ...extra,
  ]);
  read.variablePresets!.totalPresets = 60;
  return read;
}

type Reads = { refresh: () => Promise<Result<AudienceVariables>>; save: Save };

/** A designer on Preview with Find participant, saving with `save`, reading with `refresh`. */
function designerWithFind({ refresh, save }: Reads) {
  const creator = designer();
  let previewAs: PreviewAs | undefined;
  bindAudienceToCreator(
    creator,
    {
      variables: firstPage(),
      refresh,
      testParticipants: { identifierKind: AudienceIdentifierKind.Email, save },
    },
    (pick) => (previewAs = pick),
  );
  creator.activeTab = "preview";
  const pick = (preset: AudienceVariablePreset) => {
    findAction(creator)?.action?.();
    previewAs!(preset, true);
  };
  return { creator, pick };
}

function findAction(creator: SurveyCreatorModel): Action | undefined {
  const preview = creator.getPlugin("preview") as TabTestPlugin;
  return preview.model.pages.getActionById(FIND_ID);
}

const ok = (read: AudienceVariables) => Promise.resolve(Result.success(read));

describe("Picked participants past the first 20", () => {
  it("take the values a later read lists for them", async () => {
    // Arrange
    const refresh = vi.fn<Reads["refresh"]>(() => ok(firstPage()));
    const { creator, pick } = designerWithFind({ refresh, save: vi.fn() });
    await flush();
    pick({ name: ANA, variables: { tier: "bronze" } });
    refresh
      .mockImplementationOnce(() =>
        ok(firstPage("gold", [{ name: ANA, variables: { tier: "platinum" } }])),
      )
      .mockImplementation(() => ok(firstPage("silver")));

    // Act: a read lists Ana with new values, the next one leaves her out again.
    creator.activeTab = "designer";
    creator.activeTab = "preview";
    await flush();
    creator.activeTab = "designer";
    creator.activeTab = "preview";
    await flush();

    // Assert
    expect(tierOf(creator, ANA)).toBe("platinum");
  });

  it("keep a saved edit when the save's read leaves them out", async () => {
    // Arrange
    const save = vi.fn<Save>(() => ok(firstPage("silver")));
    const refresh = vi.fn<Reads["refresh"]>(() => ok(firstPage()));
    const { creator, pick } = designerWithFind({ refresh, save });
    await flush();
    pick({ name: ANA, variables: { tier: "bronze" } });
    refresh.mockImplementation(() => ok(firstPage("bronze")));

    // Act
    applyEdit(creator, withTier(ANA, "platinum"));
    await flush();
    creator.activeTab = "designer";
    creator.activeTab = "preview";
    await flush();

    // Assert
    expect(save).toHaveBeenCalledWith([
      { name: ANA, variables: { tier: "platinum" } },
    ]);
    expect(tierOf(creator, ANA)).toBe("platinum");
  });
});

describe("Never-saved drafts", () => {
  it("can be removed even when named like a real participant, which the save refuses", () => {
    // Arrange
    const { creator } = designerWithFind({
      refresh: () => ok(firstPage()),
      save: vi.fn(),
    });

    // Act
    applyEdit(creator, (presets) => [
      ...presets,
      { name: BOB.toUpperCase(), variables: { tier: "bronze" } },
    ]);

    // Assert
    expect(operations(creator, BOB.toUpperCase()).allowDelete).toBe(true);
  });
});

describe("Saves and reads in flight", () => {
  it("reads again after a save a newer read overtook, so the next Apply sends nothing", async () => {
    // Arrange
    const sent = deferred<Result<AudienceVariables>>();
    const save = vi.fn<Save>(() => sent.promise);
    const staleRead = deferred<Result<AudienceVariables>>();
    const refresh = vi.fn<Reads["refresh"]>(() => ok(firstPage()));
    const { creator } = designerWithFind({ refresh, save });
    await flush();
    refresh
      .mockImplementationOnce(() => staleRead.promise)
      .mockImplementation(() => ok(firstPage("platinum")));

    // Act: Apply, then a read that predates the save starts and lands, then the save answers.
    applyEdit(creator, withTier(MARIA, "platinum"));
    creator.activeTab = "designer";
    creator.activeTab = "preview";
    staleRead.resolve(Result.success(firstPage("gold")));
    await flush();
    sent.resolve(Result.success(firstPage("platinum")));
    await flush();
    applyEdit(creator, (presets) => presets);
    await flush();

    // Assert
    expect(save).toHaveBeenCalledTimes(1);
    expect(tierOf(creator, MARIA)).toBe("platinum");
  });

  // Serialized saves: the second Apply waits for the first save, then compares with what it saved.
  it("sends an undo applied while the first save is in flight", async () => {
    // Arrange
    const first = deferred<Result<AudienceVariables>>();
    const save = vi
      .fn<Save>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementation(() => ok(firstPage("gold")));
    const { creator } = designerWithFind({
      refresh: () => ok(firstPage()),
      save,
    });

    // Act
    applyEdit(creator, withTier(MARIA, "platinum"));
    applyEdit(creator, withTier(MARIA, "gold"));
    expect(save).toHaveBeenCalledTimes(1);
    first.resolve(Result.success(firstPage("platinum")));
    await flush();
    await flush();

    // Assert
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith([
      { name: MARIA, variables: { tier: "gold" } },
    ]);
    expect(tierOf(creator, MARIA)).toBe("gold");
  });

  it("keeps the undo on screen while the first save's read lands", async () => {
    // Arrange
    const first = deferred<Result<AudienceVariables>>();
    const second = deferred<Result<AudienceVariables>>();
    const save = vi
      .fn<Save>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { creator } = designerWithFind({
      refresh: () => ok(firstPage()),
      save,
    });

    // Act
    applyEdit(creator, withTier(MARIA, "platinum"));
    applyEdit(creator, withTier(MARIA, "gold"));
    first.resolve(Result.success(firstPage("platinum")));
    await flush();

    // Assert
    expect(tierOf(creator, MARIA)).toBe("gold");
  });
});
