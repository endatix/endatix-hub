import { describe, expect, it, vi } from "vitest";
import { bindAudienceToCreator } from "..";
import { Result } from "@/lib/result";
import {
  AudienceIdentifierKind,
  type AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import {
  MARIA,
  BOB,
  ANA,
  variables,
  designer,
  bind,
  presetManager,
  applyEdit,
  withTier,
  names,
  tierOf,
  flush,
  type Save,
} from "./write-back-fixtures";

describe("Saving Test participant values", () => {
  it("saves the added and changed Test participants in one call", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>(() =>
      Promise.resolve(Result.success(variables())),
    );
    bind(creator, { save });

    // Act
    applyEdit(creator, (presets) => [
      ...withTier(MARIA, "platinum")(presets),
      { name: ANA, variables: { tier: "bronze" } },
    ]);
    await flush();

    // Assert
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith([
      { name: MARIA, variables: { tier: "platinum" } },
      { name: ANA, variables: { tier: "bronze" } },
    ]);
  });

  it("leaves out a real participant whose email the author typed with other capitals", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>(() =>
      Promise.resolve(Result.success(variables())),
    );
    bind(creator, { save });

    // Act
    applyEdit(creator, (presets) => [
      ...presets,
      { name: BOB.toUpperCase(), variables: { tier: "bronze" } },
    ]);
    await flush();

    // Assert
    expect(save).not.toHaveBeenCalled();
  });

  it("tells the author a row named like a real participant was not saved", async () => {
    // Arrange
    const creator = designer();
    const notify = vi.spyOn(creator, "notify");
    bind(creator);

    // Act
    applyEdit(creator, (presets) => [
      ...presets,
      { name: BOB.toUpperCase(), variables: { tier: "bronze" } },
    ]);
    await flush();

    // Assert
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining(BOB.toUpperCase()),
      "error",
    );
  });

  it("sends nothing when Apply changes nothing", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>();
    bind(creator, { save });

    // Act
    applyEdit(creator, (presets) => presets);
    await flush();

    // Assert
    expect(save).not.toHaveBeenCalled();
  });

  // The PUT reconciles by identifier, so a Test participant sent unchanged would overwrite a change
  // made on the Audience tab since the designer read it.
  it("leaves out Test participants the author did not change", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>(() =>
      Promise.resolve(Result.success(variables())),
    );
    bind(creator, {
      save,
      variables: variables([
        { name: MARIA, variables: { tier: "gold" } },
        { name: ANA, variables: { tier: "bronze" } },
        { name: BOB, variables: { tier: "silver" } },
      ]),
    });

    // Act
    applyEdit(creator, withTier(ANA, "platinum"));
    await flush();

    // Assert
    expect(save).toHaveBeenCalledWith([
      { name: ANA, variables: { tier: "platinum" } },
    ]);
  });

  it("matches external ids exactly, so another case is a new Test participant", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>(() =>
      Promise.resolve(Result.success(variables())),
    );
    bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: () => Promise.resolve(Result.success(variables())),
      testParticipants: {
        identifierKind: AudienceIdentifierKind.ExternalId,
        save,
      },
    });

    // Act
    applyEdit(creator, (presets) => [
      ...presets,
      { name: BOB.toUpperCase(), variables: { tier: "bronze" } },
    ]);
    await flush();

    // Assert
    expect(save.mock.calls[0][0].map((p) => p.name)).toEqual([
      BOB.toUpperCase(),
    ]);
  });

  it("does not save when the author only picks who to preview as", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>();
    bind(creator, { save });

    // Act
    creator.activeTab = "preview";
    presetManager(creator).active = MARIA;
    await flush();

    // Assert
    expect(save).not.toHaveBeenCalled();
  });

  it("shows the saved values the API read back", async () => {
    // Arrange
    const creator = designer();
    const saved = variables([
      { name: MARIA, variables: { tier: "platinum" } },
      { name: ANA, variables: { tier: "bronze" } },
      { name: BOB, variables: { tier: "silver" } },
    ]);
    bind(creator, { save: () => Promise.resolve(Result.success(saved)) });

    // Act
    applyEdit(creator, (presets) => [
      ...withTier(MARIA, "platinum")(presets),
      { name: ANA, variables: { tier: "bronze" } },
    ]);
    await flush();

    // Assert
    expect(names(creator)).toEqual([MARIA, ANA, BOB]);
  });

  it("keeps the author's edit and shows an error when the save fails", async () => {
    // Arrange
    const creator = designer();
    const notify = vi.spyOn(creator, "notify");
    bind(creator, {
      save: () =>
        Promise.resolve(
          Result.validationError(`${ANA}: 'Tier' must be one of the choices.`),
        ),
    });

    // Act
    applyEdit(creator, withTier(MARIA, "platinum"));
    await flush();

    // Assert
    expect(tierOf(creator, MARIA)).toBe("platinum");
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining("'Tier' must be one of the choices."),
      "error",
    );
  });

  it("shows an error, and keeps the edit, when the save throws", async () => {
    // Arrange
    const creator = designer();
    const notify = vi.spyOn(creator, "notify");
    bind(creator, { save: () => Promise.reject(new Error("offline")) });

    // Act
    applyEdit(creator, withTier(MARIA, "platinum"));
    await flush();

    // Assert
    expect(tierOf(creator, MARIA)).toBe("platinum");
    expect(notify).toHaveBeenCalledWith(expect.any(String), "error");
  });

  it("keeps an edit that failed to save when Preview reads the variables again", async () => {
    // Arrange
    const creator = designer();
    const changedOnPeople = variables([
      { name: MARIA, variables: { tier: "gold" } },
      { name: BOB, variables: { tier: "bronze" } },
    ]);
    const binding = bind(creator, {
      save: () => Promise.resolve(Result.error("Server unavailable")),
      refresh: () => Promise.resolve(Result.success(changedOnPeople)),
    });
    applyEdit(creator, (presets) => [
      ...withTier(MARIA, "platinum")(presets),
      { name: ANA, variables: { tier: "bronze" } },
    ]);
    await flush();

    // Act
    await binding.refresh();

    // Assert
    expect(tierOf(creator, MARIA)).toBe("platinum");
    expect(tierOf(creator, BOB)).toBe("bronze");
    expect(names(creator)).toEqual([MARIA, BOB, ANA]);
  });

  it("drops a read that started before a save and lands after it", async () => {
    // Arrange
    const creator = designer();
    let landRead: (value: Result<AudienceVariables>) => void = () => {};
    const saved = variables([
      { name: MARIA, variables: { tier: "platinum" } },
      { name: BOB, variables: { tier: "silver" } },
    ]);
    const binding = bind(creator, {
      refresh: () => new Promise((resolve) => (landRead = resolve)),
      save: () => Promise.resolve(Result.success(saved)),
    });
    const staleRead = binding.refresh();

    // Act
    applyEdit(creator, withTier(MARIA, "platinum"));
    await flush();
    landRead(Result.success(variables()));
    await staleRead;

    // Assert
    expect(tierOf(creator, MARIA)).toBe("platinum");
  });

  it("saves nothing once the designer lets go of the Creator", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>();
    const unbind = bind(creator, { save });

    // Act
    unbind();
    applyEdit(creator, withTier(MARIA, "platinum"));
    await flush();

    // Assert
    expect(save).not.toHaveBeenCalled();
  });

  it("shows changes made elsewhere to Test participants the failed edit did not touch", async () => {
    // Arrange
    const creator = designer();
    const fresh = variables([
      { name: MARIA, variables: { tier: "gold" } },
      { name: ANA, variables: { tier: "changed-on-audience-tab" } },
      { name: BOB, variables: { tier: "silver" } },
    ]);
    const binding = bind(creator, {
      variables: variables([
        { name: MARIA, variables: { tier: "gold" } },
        { name: ANA, variables: { tier: "bronze" } },
        { name: BOB, variables: { tier: "silver" } },
      ]),
      save: () => Promise.resolve(Result.error("Server unavailable")),
      refresh: () => Promise.resolve(Result.success(fresh)),
    });
    applyEdit(creator, withTier(MARIA, "platinum"));
    await flush();

    // Act
    await binding.refresh();

    // Assert
    expect(tierOf(creator, MARIA)).toBe("platinum");
    expect(tierOf(creator, ANA)).toBe("changed-on-audience-tab");
  });

  it("forgets a discarded draft, so the next read does not bring it back", async () => {
    // Arrange
    const creator = designer();
    const binding = bind(creator, {
      save: () => Promise.resolve(Result.validationError("not an email")),
      refresh: () =>
        Promise.resolve(
          Result.success(
            variables([
              { name: MARIA, variables: { tier: "gold" } },
              { name: BOB, variables: { tier: "bronze" } },
            ]),
          ),
        ),
    });
    applyEdit(creator, (presets) => [
      ...presets,
      { name: "New test participant", variables: { tier: "x" } },
    ]);
    await flush();

    // Act
    applyEdit(creator, (presets) =>
      presets.filter((p) => p.name !== "New test participant"),
    );
    await flush();
    await binding.refresh();

    // Assert
    expect(names(creator)).toEqual([MARIA, BOB]);
  });
});
