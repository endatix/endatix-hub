type ResumeListener = () => void;

export class EmbedHeightReportingController {
  private frozen = false;
  private readonly resumeListeners = new Set<ResumeListener>();

  freeze(): void {
    this.frozen = true;
  }

  /** Unfreeze and notify listeners (needed: mutations while frozen will not re-fire). */
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
