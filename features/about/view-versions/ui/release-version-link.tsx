"use client";

import { TextLink } from "@/components/common/text-link";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import {
  releaseNotesUrl,
  type ReleaseNotesSource,
  type ReleaseProduct,
} from "@/lib/hosting/release-notes-url";

interface ReleaseVersionLinkProps {
  product: ReleaseProduct;
  version: string | null;
  source: ReleaseNotesSource;
}

/**
 * A version, linked to its GitHub release notes. The click is tracked here:
 * GitHub reports no UTM data to the repo owner, so this event is how we know
 * the link is used.
 */
export function ReleaseVersionLink(props: Readonly<ReleaseVersionLinkProps>) {
  const { trackEvent } = useTrackEvent();
  const href = releaseNotesUrl(props.product, props.version, props.source);

  if (!props.version || !href) {
    return <VersionText version={props.version} />;
  }

  return (
    <TextLink
      external
      href={href}
      className="font-mono"
      onClick={() => trackEvent("release_notes_opened", { ...props })}
    >
      {props.version}
    </TextLink>
  );
}

function VersionText({ version }: Readonly<{ version: string | null }>) {
  if (!version) {
    return (
      <span className="font-mono text-muted-foreground">
        —<span className="sr-only">Not available</span>
      </span>
    );
  }

  return <span className="font-mono">{version}</span>;
}
