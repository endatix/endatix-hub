import type {
  SurveyCreatorModel,
  TabJsonEditorBasePlugin,
} from "survey-creator-core";
import { Result } from "@/lib/result";
import { JSON_EDITOR_PLUGIN_NAME } from "../json-editor/json-editor-state";
import { reviewEmbeddedImages, replaceEmbeddedImages } from "./embedded-images";
import { equalDefinition, sourceWithEdits } from "./source-definition";
import { applyImageEdit, matchEditorFields } from "./image-conversion-edit";
import { definitionBytes, estimatedImageSavings, sizeChange } from "./definition-size";

export interface ImageSnapshot {
  source: object;
  projection: object;
  survey: SurveyCreatorModel["survey"];
  revision: number;
  bytes: number;
  estimatedSavings: number;
  inventory: ReturnType<typeof reviewEmbeddedImages>;
}

const REVIEW_AGAIN = "The definition changed. Review images again.";
const sessions = new WeakMap<SurveyCreatorModel, ConversionSession>();

export class ConversionSession {
  readonly uploads = new Map<string, string>();
  private readonly transfers = new Map<string, Promise<string>>();
  private pending = false;
  private submitted?: { payload: object; echoed: boolean };
  private generation = 0;
  private revision = 0;
  private ambiguousBuffer = false;
  private readonly onModified = () => {
    this.revision++;
  };
  private undoPoint?: ReturnType<typeof applyImageEdit>;
  lastConversion?: ImageSnapshot;
  measuredChange?: ReturnType<typeof sizeChange>;

  constructor(
    readonly creator: SurveyCreatorModel,
    private source: object,
    private baseline: object,
  ) {
    creator.onModified?.add(this.onModified);
  }

  dispose() {
    this.creator.onModified?.remove(this.onModified);
  }

  async storeOnce(key: string, upload: () => Promise<string>) {
    const confirmed = this.uploads.get(key);
    if (confirmed) return confirmed;
    const pending = this.transfers.get(key);
    if (pending) return pending;
    const transfer = upload();
    this.transfers.set(key, transfer);
    try {
      const url = await transfer;
      this.uploads.set(key, url);
      return url;
    } finally { this.transfers.delete(key); }
  }

  review(): ImageSnapshot {
    if (this.ambiguousBuffer) throw new Error(REVIEW_AGAIN);
    const projection: object = this.creator.JSON;
    const source = sourceWithEdits(this.source, this.baseline, projection);
    const inventory = matchEditorFields(
      this.creator,
      reviewEmbeddedImages(source),
    );
    return {
      source,
      projection,
      survey: this.creator.survey,
      revision: this.revision,
      inventory,
      bytes: definitionBytes(source),
      estimatedSavings: estimatedImageSavings(inventory),
    };
  }

  acceptEditorText(text: string) {
    try {
      const source = sourceWithEdits(
        this.source,
        this.baseline,
        JSON.parse(text),
      );
      this.baseline = this.creator.JSON;
      this.source = source;
      this.ambiguousBuffer = false;
    } catch {
      this.ambiguousBuffer = true;
    }
  }

  current(snapshot: ImageSnapshot) {
    return (
      sessions.get(this.creator) === this &&
      this.creator.survey === snapshot.survey &&
      this.revision === snapshot.revision &&
      this.creator.activeTab !== JSON_EDITOR_PLUGIN_NAME &&
      equalDefinition(this.creator.JSON, snapshot.projection)
    );
  }

  apply(snapshot: ImageSnapshot) {
    if (!this.current(snapshot)) return "stale";
    const source = replaceEmbeddedImages(
      snapshot.source,
      snapshot.inventory,
      this.uploads,
    );
    this.undoPoint = applyImageEdit(
      this.creator,
      { converted: source, review: snapshot.inventory },
      this.captureEdit(snapshot, source),
    );
    return "converted";
  }

  private captureEdit(snapshot: ImageSnapshot, source: object) {
    let convertedBaseline: object;
    const measurement = sizeChange(snapshot.bytes, definitionBytes(source));
    return (stored: boolean) => {
      this.source = stored ? source : snapshot.source;
      if (stored) convertedBaseline ??= this.creator.JSON;
      this.baseline = stored ? convertedBaseline : snapshot.projection;
      this.pending = true;
      this.generation++;
      this.lastConversion = stored ? snapshot : undefined;
      this.measuredChange = stored ? measurement : undefined;
    };
  }
  undo() {
    if (
      !this.undoPoint ||
      this.creator.undoRedoManager.peekTransaction(true) !== this.undoPoint
    )
      return false;
    this.creator.undo();
    return true;
  }

  consumeSaveEcho(source: object) {
    const submitted = this.submitted;
    if (!submitted || submitted.echoed || !equalDefinition(submitted.payload, source)) return false;
    submitted.echoed = true;
    return true;
  }

  prepare(projection: object) {
    if (this.pending && this.ambiguousBuffer) throw new Error(REVIEW_AGAIN);
    const payload = this.pending
      ? sourceWithEdits(this.source, this.baseline, this.validatedEditorInput(projection))
      : projection;
    if (this.pending) this.submitted = { payload, echoed: false };
    const request = { generation: this.generation, converted: this.pending, payload, projection };
    return {
      payload,
      acknowledge: () => this.acknowledge(request),
    };
  }

  private acknowledge(request: { generation: number; converted: boolean; payload: object; projection: object }) {
    if (sessions.get(this.creator) !== this || request.generation !== this.generation) return false;
    if (request.converted && this.submitted?.payload !== request.payload) return false;
    this.source = request.payload;
    this.baseline = request.projection;
    const unchanged = !request.converted || this.creator.activeTab === JSON_EDITOR_PLUGIN_NAME ||
      equalDefinition(this.creator.JSON, request.projection);
    if (unchanged) {
      this.undoPoint = undefined;
      this.lastConversion = undefined;
      this.pending = false;
    }
    return unchanged;
  }

  /** getJsonModel already validated this buffer. Its normalized result omits explicit defaults. */
  private validatedEditorInput(projection: object): object {
    if (this.creator.activeTab !== JSON_EDITOR_PLUGIN_NAME) return projection;
    const tab: TabJsonEditorBasePlugin = this.creator.getPlugin(
      JSON_EDITOR_PLUGIN_NAME,
    );
    return JSON.parse(tab.model.text);
  }
}

export function bindConversionSource(
  creator: SurveyCreatorModel,
  source: object,
) {
  sessions.get(creator)?.dispose();
  sessions.set(creator, new ConversionSession(creator, source, creator.JSON));
}

export function unbindConversionSource(creator: SurveyCreatorModel) {
  sessions.get(creator)?.dispose();
  sessions.delete(creator);
}

export function conversionSession(creator: SurveyCreatorModel | null) {
  return creator ? sessions.get(creator) : undefined;
}

export function prepareDefinitionSave(
  creator: SurveyCreatorModel | null,
  validated: object,
): Result<ReturnType<ConversionSession["prepare"]>> {
  try {
    return Result.success(
      conversionSession(creator)?.prepare(validated) ?? {
        payload: validated,
        acknowledge: () => true,
      },
    );
  } catch {
    return Result.validationError(
      "Cannot safely match this edit to the converted definition. Review changes before saving.",
    );
  }
}
