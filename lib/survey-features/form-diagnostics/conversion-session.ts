import type { SurveyCreatorModel } from "survey-creator-core";
import { Result } from "@/lib/result";
import { reviewEmbeddedImages, replaceEmbeddedImages } from "./embedded-images";
import { equalDefinition, sourceWithEdits } from "./source-definition";

export interface ImageSnapshot {
  source: object;
  projection: object;
  survey: SurveyCreatorModel["survey"];
  inventory: ReturnType<typeof reviewEmbeddedImages>;
}

const REVIEW_AGAIN = "The definition changed. Review images again.";
const sessions = new WeakMap<SurveyCreatorModel, ConversionSession>();

export class ConversionSession {
  readonly uploads = new Map<string, string>();
  private pending = false;
  private submitted?: object;
  private generation = 0;
  private undoPoint?: { before: ImageSnapshot; after: object };

  constructor(readonly creator: SurveyCreatorModel, private source: object, private baseline: object) {}

  review(): ImageSnapshot {
    const projection: object = this.creator.JSON;
    const source = sourceWithEdits(this.source, this.baseline, projection);
    return { source, projection, survey: this.creator.survey, inventory: reviewEmbeddedImages(source) };
  }

  current(snapshot: ImageSnapshot) {
    return sessions.get(this.creator) === this && this.creator.survey === snapshot.survey &&
      this.creator.activeTab !== "json" && equalDefinition(this.creator.JSON, snapshot.projection);
  }

  apply(snapshot: ImageSnapshot) {
    if (!this.current(snapshot)) throw new Error(REVIEW_AGAIN);
    const source = replaceEmbeddedImages(snapshot.source, snapshot.inventory, this.uploads);
    this.setCanvas(source);
    this.undoPoint = { before: snapshot, after: this.baseline };
  }

  undo() {
    if (!this.undoPoint || !equalDefinition(this.creator.JSON, this.undoPoint.after)) return false;
    this.setCanvas(this.undoPoint.before.source);
    this.undoPoint = undefined;
    return true;
  }

  private setCanvas(source: object) {
    this.creator.changeText(JSON.stringify(source), false, true);
    this.source = source;
    this.baseline = this.creator.JSON;
    this.pending = true;
    this.generation++;
    this.creator.setModified({ type: "PROPERTY_CHANGED" });
  }

  isSubmitted(source: object) { return this.submitted !== undefined && equalDefinition(this.submitted, source); }

  prepare(projection: object) {
    const payload = this.pending ? sourceWithEdits(this.source, this.baseline, projection) : projection;
    if (this.pending) this.submitted = payload;
    const generation = this.generation;
    const wasPending = this.pending;
    return { payload, acknowledge: () => {
      if (sessions.get(this.creator) !== this || generation !== this.generation || (wasPending && this.submitted !== payload)) return false;
      this.source = payload;
      this.baseline = projection;
      const unchanged = !wasPending || (this.creator.activeTab === "json" || equalDefinition(this.creator.JSON, projection));
      if (unchanged) {
        this.undoPoint = undefined;
        this.pending = false;
      }
      return unchanged;
    } };
  }
}

export function bindConversionSource(creator: SurveyCreatorModel, source: object) {
  sessions.set(creator, new ConversionSession(creator, source, creator.JSON));
}

export function conversionSession(creator: SurveyCreatorModel | null) {
  return creator ? sessions.get(creator) : undefined;
}

export function prepareDefinitionSave(creator: SurveyCreatorModel | null, validated: object): Result<ReturnType<ConversionSession["prepare"]>> {
  try {
    return Result.success(conversionSession(creator)?.prepare(validated) ?? { payload: validated, acknowledge: () => true });
  } catch {
    return Result.validationError("Cannot safely match this edit to the converted definition. Review changes before saving.");
  }
}
