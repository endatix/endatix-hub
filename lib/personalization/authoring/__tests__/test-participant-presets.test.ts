import { describe, expect, it } from "vitest";
import type { ISurveyVariablePresets } from "survey-core";
import { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { testParticipantPresets } from "..";

const EMAIL = AudienceIdentifierKind.Email;
const EXTERNAL_ID = AudienceIdentifierKind.ExternalId;

const MARIA = "maria@acme.test";
const BOB = "bob@acme.test";
const ANA = "ana@acme.test";
const PICKED = "picked@acme.test";

function container(
  ...presets: NonNullable<ISurveyVariablePresets["presets"]>
): ISurveyVariablePresets {
  return {
    definition: { elements: [{ type: "text", name: "tier" }] },
    presets,
  };
}

describe("testParticipantPresets", () => {
  it("saves only Test participants, leaving out every read-only preset", () => {
    // Arrange
    const edited = container(
      {
        name: MARIA,
        description: "Test participant",
        variables: { tier: "gold" },
      },
      { name: BOB, description: "Participant", variables: { tier: "silver" } },
      {
        name: ANA,
        description: "Test participant",
        variables: { tier: "bronze" },
      },
    );

    // Act & Assert
    expect(testParticipantPresets(edited, [BOB], EMAIL)).toEqual([
      { name: MARIA, variables: { tier: "gold" } },
      { name: ANA, variables: { tier: "bronze" } },
    ]);
  });

  it("leaves out a real participant picked after the page loaded", () => {
    // Arrange
    const edited = container(
      { name: MARIA, variables: { tier: "gold" } },
      { name: PICKED, variables: { tier: "silver" } },
    );

    // Act & Assert
    expect(testParticipantPresets(edited, [BOB, PICKED], EMAIL)).toEqual([
      { name: MARIA, variables: { tier: "gold" } },
    ]);
  });

  it("leaves out a real participant's email typed with other capitals or spaces", () => {
    // Arrange
    const edited = container(
      { name: " Bob@ACME.test ", variables: { tier: "silver" } },
      { name: MARIA, variables: { tier: "gold" } },
    );

    // Act & Assert
    expect(testParticipantPresets(edited, [BOB], EMAIL)).toEqual([
      { name: MARIA, variables: { tier: "gold" } },
    ]);
  });

  it("keeps an external id that differs only in capitals: source systems tell them apart", () => {
    // Arrange
    const edited = container({ name: "AbC", variables: { tier: "silver" } });

    // Act & Assert
    expect(testParticipantPresets(edited, ["abc"], EXTERNAL_ID)).toEqual([
      { name: "AbC", variables: { tier: "silver" } },
    ]);
  });

  it("copies the values, so a later edit in the Creator leaves the body as it was", () => {
    // Arrange
    const variables = { tier: "gold" };
    const edited = container({ name: MARIA, variables });

    // Act
    const [saved] = testParticipantPresets(edited, [], EMAIL);
    variables.tier = "silver";

    // Assert
    expect(saved.variables).toEqual({ tier: "gold" });
  });

  it("saves nothing when the form has no presets", () => {
    // Act & Assert
    expect(testParticipantPresets(undefined, [], EMAIL)).toEqual([]);
    expect(testParticipantPresets({}, [BOB], EMAIL)).toEqual([]);
  });
});
