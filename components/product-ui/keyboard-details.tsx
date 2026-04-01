import { cn } from "@/lib/utils";
import { OS_MACOS_CLASS } from "@/lib/utils/next-utils";

const WRAPPER_CLASS =
  "absolute top-1/2 right-4 hidden -translate-y-1/2 gap-1 sm:flex";
const KEYBOARD_KEY_CLASS =
  "bg-slate-200 px-1.5 py-0.5 font-sans text-xs/4 text-[10px] font-bold text-slate-500 dark:text-gray-400";
/**
 * Kbd component for displaying keyboard shortcuts.
 * @param defaultKeys - The keys to display for non-macOS users.
 * @param macOsSpecificKeys - The keys to display for macOS users. These are optional and will only be displayed if provided.
 * @param props - The props to pass to the div element.
 * @returns The Kbd component.
 */
interface KeyboardDetailsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultKeys: string[];
  macOsSpecificKeys?: string[];
  keyClassName?: string;
}

/**
 * KeyboardDetails component for displaying keyboard shortcuts.
 * @param defaultKeys - The keys to display for non-macOS users.
 * @param macOsSpecificKeys - The keys to display for macOS users. These are optional and will only be displayed if provided.
 * @param keyClassName - The class name to apply to the keyboard key.
 * @param props - The props to pass to the div element.
 * @returns The KeyboardDetails component.
 */
export function KeyboardDetails({
  defaultKeys,
  macOsSpecificKeys,
  keyClassName,
  ...props
}: Readonly<KeyboardDetailsProps>) {
  if (!macOsSpecificKeys || macOsSpecificKeys.length === 0) {
    return (
      <div className={cn(WRAPPER_CLASS, props.className)} {...props}>
        <KeyboardKeyGroup
          keys={defaultKeys}
          keyClassName={keyClassName}
          groupClassName=""
        />
      </div>
    );
  }

  return (
    <div className={cn(WRAPPER_CLASS, props.className)} {...props}>
      <KeyboardKeyGroup
        keys={defaultKeys}
        keyClassName={keyClassName}
        groupClassName={`hidden not-[.${OS_MACOS_CLASS}_&]:flex`}
      />

      <KeyboardKeyGroup
        keys={macOsSpecificKeys}
        keyClassName={keyClassName}
        groupClassName={`hidden [.${OS_MACOS_CLASS}_&]:flex`}
      />
    </div>
  );
}

function KeyboardKeyGroup({
  keys,
  keyClassName,
  groupClassName,
}: Readonly<{
  keys: string[];
  keyClassName?: string;
  groupClassName?: string;
}>) {
  return (
    <div className={cn("flex gap-1", groupClassName)}>
      {keys.map((key) => (
        <KeyboardKey key={key} keyLiteral={key} className={keyClassName} />
      ))}
    </div>
  );
}

function KeyboardKey({
  keyLiteral,
  className,
}: Readonly<{
  keyLiteral: string;
  className?: string;
}>) {
  return <kbd className={cn(KEYBOARD_KEY_CLASS, className)}>{keyLiteral}</kbd>;
}
