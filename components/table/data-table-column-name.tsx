import { cn } from "@/lib/utils";

const CHOICE_SEPARATOR = "__";
/** Characters a name with no suffix keeps at its end, as `TruncatedId` does. */
const TAIL_CHARS = 4;
/** `whitespace-pre` keeps a space at the split (`First ` + `Name`); `truncate` would drop it. */
const CUT_CLASS_NAME = "overflow-hidden text-ellipsis whitespace-pre";
/** The start gives way first; the suffix cuts at its end only when it alone is too wide. */
const HEAD_CLASS_NAME = `min-w-0 ${CUT_CLASS_NAME}`;
const TAIL_CLASS_NAME = `max-w-full shrink-0 ${CUT_CLASS_NAME}`;

/**
 * A question name that shortens in the middle when its column is too narrow,
 * as `TruncatedId` does: the start and the choice suffix (from the last `__`)
 * stay, e.g. `QUESTION_VERY_LO…__Alpha`. A name with no suffix keeps its last
 * few characters. Screen readers get the full name.
 */
export function DataTableColumnName({
  name,
  className,
}: Readonly<{ name: string; className?: string }>) {
  const { head, tail } = splitName(name);
  return (
    <span className={cn("block max-w-full min-w-0", className)}>
      <span className="sr-only">{name}</span>
      <span aria-hidden className="flex max-w-full min-w-0">
        <span data-slot="column-name-head" className={HEAD_CLASS_NAME}>
          {head}
        </span>
        <span data-slot="column-name-tail" className={TAIL_CLASS_NAME}>
          {tail}
        </span>
      </span>
    </span>
  );
}

function splitName(name: string): { head: string; tail: string } {
  const suffixStart = name.lastIndexOf(CHOICE_SEPARATOR);
  const hasSuffix =
    suffixStart > 0 && suffixStart + CHOICE_SEPARATOR.length < name.length;
  return hasSuffix
    ? { head: name.slice(0, suffixStart), tail: name.slice(suffixStart) }
    : splitEnd(name);
}

/**
 * Counts the tail in characters, not UTF-16 units, so an emoji stays whole.
 * The `__` split needs no such care: it cuts before `_`.
 */
function splitEnd(name: string): { head: string; tail: string } {
  const tail = [...name].slice(-TAIL_CHARS).join("");
  return { head: name.slice(0, name.length - tail.length), tail };
}
