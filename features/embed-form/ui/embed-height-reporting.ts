type ResumeListener = () => void;

export class EmbedHeightReportingController {
  private frozen = false;
  private readonly resumeListeners = new Set<ResumeListener>();

  freeze(): void {
    this.frozen = true;
  }

  /**
   * Lifts the freeze and signals listeners to re-measure.
   *
   * Resuming on its own would report nothing: the mutations that changed the height
   * happened while frozen, so the observer has already fired for them and will not
   * fire again. Without this signal the iframe keeps the height of the last form
   * page after a submit (h947).
   */
  resume(): void {
    this.frozen = false;
    for (const listener of this.resumeListeners) {
      listener();
    }
  }

  isFrozen(): boolean {
    return this.frozen;
  }

  /** Subscribes to resume signals. Returns the unsubscribe function. */
  onResume(listener: ResumeListener): () => void {
    this.resumeListeners.add(listener);
    return () => {
      this.resumeListeners.delete(listener);
    };
  }
}

export const embedHeightReporting = new EmbedHeightReportingController();
