import { describe, expect, it } from "vitest";
import type { ISurveyVariablePresets } from "survey-core";
import { testParticipantPresets } from "..";

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
    const edited = container(
      { name: MARIA, description: "Test participant", variables: { tier: "gold" } },
      { name: BOB, description: "Participant", variables: { tier: "silver" } },
      { name: ANA, description: "Test participant", variables: { tier: "bronze" } },
    );

    expect(testParticipantPresets(edited, [BOB])).toEqual([
      { name: MARIA, variables: { tier: "gold" } },
      { name: ANA, variables: { tier: "bronze" } },
    ]);
  });

  it("leaves out a real participant picked after the page loaded", () => {
    const edited = container(
      { name: MARIA, variables: { tier: "gold" } },
      { name: PICKED, variables: { tier: "silver" } },
    );

    expect(testParticipantPresets(edited, [BOB, PICKED])).toEqual([
      { name: MARIA, variables: { tier: "gold" } },
    ]);
  });

  it("saves nothing when the form has no presets", () => {
    expect(testParticipantPresets(undefined, [])).toEqual([]);
    expect(testParticipantPresets({}, [BOB])).toEqual([]);
  });
});
