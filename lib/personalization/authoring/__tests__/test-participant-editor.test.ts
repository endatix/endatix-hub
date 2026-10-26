import { describe, expect, it } from "vitest";
import { bindAudienceToCreator } from "..";
import { Result } from "@/lib/result";
import { type TabTestPlugin } from "survey-creator-core";
import {
  MARIA,
  BOB,
  ANA,
  variables,
  designer,
  bind,
  presetManager,
  operations,
  applyEdit,
} from "./write-back-fixtures";

describe("Test participant values editor", () => {
  it("lets the author add and edit Test participants, and never delete a saved one", () => {
    // Arrange
    const creator = designer();

    // Act
    bind(creator);

    // Assert
    expect(presetManager(creator)).toMatchObject({
      allowAdd: true,
      allowEdit: true,
    });
    expect(operations(creator, MARIA)).toEqual({
      allowEdit: true,
      allowDelete: false,
    });
  });

  // A draft the API refused would otherwise come back over every read and fail every later save.
  it("lets the author discard a Test participant added here and never saved", () => {
    // Arrange
    const creator = designer();
    bind(creator, {
      save: () => Promise.resolve(Result.error("Server unavailable")),
    });

    // Act
    applyEdit(creator, (presets) => [
      ...presets,
      { name: ANA, variables: { tier: "bronze" } },
    ]);

    // Assert
    expect(operations(creator, ANA)).toEqual({
      allowEdit: true,
      allowDelete: true,
    });
  });

  it("locks a Test row named like a real participant by the match key", () => {
    // Arrange
    const creator = designer();
    bind(creator);

    // Act
    applyEdit(creator, (presets) => [
      ...presets,
      { name: BOB.toUpperCase(), variables: { tier: "bronze" } },
    ]);

    // Assert
    expect(operations(creator, BOB.toUpperCase()).allowEdit).toBe(false);
  });

  it("switches the Preview toolbar to Edit when a read starts allowing it", async () => {
    // Arrange
    const creator = designer();
    const noEditing = {
      ...variables(),
      editing: { allowAdd: false, allowEdit: false, allowDelete: false },
    };
    const binding = bind(creator, {
      variables: noEditing,
      refresh: () => Promise.resolve(Result.success(variables())),
    });
    creator.activeTab = "preview";
    const toolbar = (creator.getPlugin("preview") as TabTestPlugin).model;
    expect(toolbar.viewVariablesAction.title).toBe("Participant values");

    // Act
    await binding.refresh();

    // Assert
    expect(toolbar.viewVariablesAction.title).toBe(
      "Edit test participant values",
    );
  });

  it("locks a real participant, so they can't be renamed, edited or deleted", () => {
    // Arrange
    const creator = designer();

    // Act
    bind(creator);

    // Assert
    expect(operations(creator, BOB)).toEqual({
      allowEdit: false,
      allowDelete: false,
    });
  });

  it("keeps the editor read-only when the API allows no editing", () => {
    // Arrange
    const creator = designer();
    const readOnly = {
      ...variables(),
      editing: { allowAdd: false, allowEdit: false, allowDelete: false },
    };

    // Act
    bind(creator, { variables: readOnly });

    // Assert
    expect(presetManager(creator)).toMatchObject({
      allowAdd: false,
      allowEdit: false,
      allowDelete: false,
    });
  });

  it("keeps the editor read-only when the designer cannot save", () => {
    // Arrange
    const creator = designer();

    // Act
    bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: () => Promise.resolve(Result.success(variables())),
    });

    // Assert
    expect(presetManager(creator).canEdit).toBe(false);
  });

  it("locks whoever the latest read lists as real", async () => {
    // Arrange
    const creator = designer();
    const fresh = variables(
      [
        { name: MARIA, variables: { tier: "gold" } },
        { name: BOB, variables: { tier: "silver" } },
      ],
      [MARIA],
    );
    const binding = bind(creator, {
      refresh: () => Promise.resolve(Result.success(fresh)),
    });

    // Act
    await binding.refresh();

    // Assert
    expect(binding.readOnlyPresets()).toEqual([MARIA]);
    expect(operations(creator, MARIA).allowEdit).toBe(false);
    expect(operations(creator, BOB).allowEdit).toBe(true);
  });
});
