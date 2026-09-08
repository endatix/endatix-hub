import { describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import {
  isLoopSyncInProgress,
  runLoopSyncExclusively,
} from "../loop-sync-state";

/**
 * The re-entrancy contract of the sync guard.
 *
 * Assigning a loop's `value` raises value events while the sync is still
 * running, and those handlers would otherwise re-enter and re-walk the tree.
 * The guard drops that re-entry — and, critically, is scoped per survey, which
 * the module-level flag it replaced was not.
 */
describe("runLoopSyncExclusively", () => {
  it("runs the work and releases the guard afterwards", () => {
    // arrange
    const survey = new SurveyModel();
    let ran = 0;

    // act
    runLoopSyncExclusively(survey, () => {
      ran += 1;
      expect(isLoopSyncInProgress(survey)).toBe(true);
    });

    // assert
    expect(ran).toBe(1);
    expect(isLoopSyncInProgress(survey)).toBe(false);
  });

  it("drops re-entrant work for the same survey", () => {
    // arrange
    const survey = new SurveyModel();
    let inner = 0;

    // act — the echo a `value` assignment would produce mid-sync
    runLoopSyncExclusively(survey, () => {
      runLoopSyncExclusively(survey, () => {
        inner += 1;
      });
    });

    // assert
    expect(inner).toBe(0);
  });

  it("does not let one survey's sync silence another's", () => {
    // arrange — the defect the module-level flag had: one shared boolean for
    // every survey on the page
    const surveyA = new SurveyModel();
    const surveyB = new SurveyModel();
    let ranB = 0;

    // act
    runLoopSyncExclusively(surveyA, () => {
      runLoopSyncExclusively(surveyB, () => {
        ranB += 1;
      });
    });

    // assert
    expect(ranB).toBe(1);
  });

  it("releases the guard when the work throws", () => {
    // arrange
    const survey = new SurveyModel();

    // act
    expect(() =>
      runLoopSyncExclusively(survey, () => {
        throw new Error("sync blew up");
      }),
    ).toThrow("sync blew up");

    // assert — a stuck guard would silently disable syncing for this survey
    expect(isLoopSyncInProgress(survey)).toBe(false);
    let ranAfter = 0;
    runLoopSyncExclusively(survey, () => {
      ranAfter += 1;
    });
    expect(ranAfter).toBe(1);
  });

  it("ignores a missing survey", () => {
    // arrange
    let ran = 0;

    // act
    runLoopSyncExclusively(undefined as never, () => {
      ran += 1;
    });

    // assert
    expect(ran).toBe(0);
    expect(isLoopSyncInProgress(undefined as never)).toBe(false);
  });
});
