let frozen = false;

export function freezeEmbedHeightReporting(): void {
  frozen = true;
}

export function resumeEmbedHeightReporting(): void {
  frozen = false;
}

export function isEmbedHeightReportingFrozen(): boolean {
  return frozen;
}
