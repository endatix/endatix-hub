import Link from "next/link";

export function NoActiveFoldersNotice() {
  return (
    <p className="text-sm text-destructive">
      No active folders exist.{" "}
      <Link
        href="/folders?action=create"
        className="font-medium underline underline-offset-4"
      >
        Create a folder
      </Link>{" "}
      before creating a form.
    </p>
  );
}
