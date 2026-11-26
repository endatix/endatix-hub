"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Result } from "@/lib/result";
import { saveGuide } from "./save-guide.action";

type GuideProps = {
  dismissed: boolean;
  scope: string;
  links: { title: string; url: string }[];
};

function useGuidePreference({ dismissed, scope }: GuideProps) {
  const [hidden, setHidden] = useState(dismissed);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function update(next: boolean) {
    startTransition(async () => {
      setError("");
      try {
        const result = await saveGuide(scope, next);
        if (Result.isError(result)) setError(result.message);
        else setHidden(result.value);
      } catch {
        setError("Could not save your preference. Try again.");
      }
    });
  }
  return { hidden, pending, error, update };
}

export function PersonalGuide(props: Readonly<GuideProps>) {
  const { hidden, pending, error, update } = useGuidePreference(props);
  return (
    <aside aria-label="Personal help" className="fixed right-4 bottom-4 z-40 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
      {hidden ? (
        <GuideHelp links={props.links} pending={pending} reopen={() => update(false)} />
      ) : (
        <div className="w-64 max-w-full space-y-2 p-2">
          <h2 className="font-semibold">Getting started</h2>
          <p className="text-sm">Open a form from Forms. In the editor, select a question to edit it, then use Preview to try it as a respondent.</p>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => update(true)}>Dismiss guide</Button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </aside>
  );
}

function GuideHelp({ links, pending, reopen }: Readonly<{
  links: GuideProps["links"]; pending: boolean; reopen: () => void;
}>) {
  return (
    <details>
      <summary className="cursor-pointer px-2 text-sm font-medium">Help</summary>
      <Button variant="ghost" disabled={pending} onClick={reopen}>Getting started</Button>
      {links.map(({ title, url }) => (
        <a className="block px-3 py-1 text-sm underline" key={title} href={url} target="_blank" rel="noreferrer">
          {title}
        </a>
      ))}
    </details>
  );
}
