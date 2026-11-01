/** `—` for a value never set, with the words for a screen reader (DESIGN.md §6 Unset ≠ empty). */
export function NotSet({ label = "Not set" }: Readonly<{ label?: string }>) {
  return (
    <span className="text-muted-foreground">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
