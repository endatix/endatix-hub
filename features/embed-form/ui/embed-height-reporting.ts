export class EmbedHeightReportingController {
  private frozen = false;

  freeze(): void {
    this.frozen = true;
  }

  resume(): void {
    this.frozen = false;
  }

  isFrozen(): boolean {
    return this.frozen;
  }
}

export const embedHeightReporting = new EmbedHeightReportingController();
