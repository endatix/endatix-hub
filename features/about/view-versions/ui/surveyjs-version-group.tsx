"use client";

import { SummaryRow } from "@/components/common/summary-row";
import type { SurveyJsVersions } from "@/lib/hosting/hub-version";
import {
  SURVEYJS_PACKAGES,
  type SurveyJsPackage,
} from "@/lib/hosting/surveyjs-packages.mjs";
import { ReleaseVersionLink } from "./release-version-link";
import { VersionSkeleton } from "./version-skeleton";

const HEADING_ID = "about-surveyjs-versions";

interface SurveyJsVersionGroupProps {
  /** Undefined while the first read is running. */
  versions: SurveyJsVersions | null | undefined;
}

/**
 * The libraries Endatix is built on, lifted below the product rows. When every
 * library is on one version (the usual case) it is one row; otherwise one row each.
 */
export function SurveyJsVersionGroup({
  versions,
}: Readonly<SurveyJsVersionGroupProps>) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="grid gap-3 rounded-md bg-surface-container-lowest p-3"
    >
      <h4 id={HEADING_ID} className="text-xs font-medium text-muted-foreground">
        Built on SurveyJS
      </h4>
      <GroupRows versions={versions} />
    </section>
  );
}

function GroupRows({ versions }: Readonly<SurveyJsVersionGroupProps>) {
  if (versions === undefined) {
    return <SharedRow version={undefined} />;
  }

  const shared = sharedVersion(versions);
  return shared ? (
    <SharedRow version={shared} />
  ) : (
    <PackageRows versions={versions} />
  );
}

function SharedRow({ version }: Readonly<{ version: string | undefined }>) {
  return (
    <div className="grid gap-1">
      <dl aria-busy={version === undefined}>
        <SummaryRow
          label={`All ${SURVEYJS_PACKAGES.length} libraries`}
          value={<SharedVersion version={version} />}
        />
      </dl>
      <p className="text-xs text-muted-foreground">
        {SURVEYJS_PACKAGES.map((name, index) => (
          <span key={name} className="whitespace-nowrap">
            {name}
            {index < SURVEYJS_PACKAGES.length - 1 && ", "}
          </span>
        ))}
      </p>
    </div>
  );
}

function SharedVersion({ version }: Readonly<{ version: string | undefined }>) {
  if (version === undefined) {
    return <VersionSkeleton />;
  }

  return <NotesLink product="survey-core" version={version} />;
}

function PackageRows({
  versions,
}: Readonly<{ versions: SurveyJsVersions | null }>) {
  return (
    <dl className="grid gap-2">
      {SURVEYJS_PACKAGES.map((name) => (
        <SummaryRow
          key={name}
          label={name}
          value={
            <NotesLink product={name} version={versions?.[name] ?? null} />
          }
        />
      ))}
    </dl>
  );
}

function NotesLink(
  props: Readonly<{
    product: SurveyJsPackage;
    version: string | null;
  }>,
) {
  return <ReleaseVersionLink {...props} source="about_dialog" />;
}

/** The one version every library is on, or null when any differs or is missing. */
function sharedVersion(versions: SurveyJsVersions | null): string | null {
  const [first, ...rest] = SURVEYJS_PACKAGES.map((name) => versions?.[name]);
  return first && rest.every((version) => version === first) ? first : null;
}
