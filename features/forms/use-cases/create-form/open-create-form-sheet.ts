let openCreateFormSheet: (() => void) | undefined;

/** Header sheet registers the opener. Empty states call it. */
export function registerOpenCreateFormSheet(open: () => void): () => void {
  openCreateFormSheet = open;
  return () => {
    if (openCreateFormSheet === open) {
      openCreateFormSheet = undefined;
    }
  };
}

export function requestOpenCreateFormSheet(): void {
  openCreateFormSheet?.();
}
