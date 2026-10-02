"use client";

import { useEffect } from "react";
import { Tag } from "lucide-react";
import { PanelSection } from "@/components/common/panel-section";
import { SummaryRow } from "@/components/common/summary-row";
import CopyToClipboard from "@/components/copy-to-clipboard";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import { formatBuildIdentity } from "@/lib/hosting/build-identity";
import type { ProductVersions } from "../../types";
import { useProductVersions } from "../use-product-versions.hook";
import { BuildRef } from "./build-ref";
import { ReleaseVersionLink } from "./release-version-link";

interface AboutEndatixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutEndatixDialog({
  open,
  onOpenChange,
}: Readonly<AboutEndatixDialogProps>) {
  const versions = useProductVersions(open);
  useTrackOpen(open);

  return (
    <ResponsivePanel
      open={open}
      onOpenChange={onOpenChange}
      desktopType="simple"
      drawerContentClassName="h-auto"
    >
      <AboutHeader />
      <ResponsivePanelBody>
        <VersionList versions={versions} />
      </ResponsivePanelBody>
    </ResponsivePanel>
  );
}

function AboutHeader() {
  return (
    <ResponsivePanelHeader>
      <ResponsivePanelTitle>About Endatix</ResponsivePanelTitle>
      <ResponsivePanelDescription>
        The versions you are using. Include them when you report an issue.
      </ResponsivePanelDescription>
    </ResponsivePanelHeader>
  );
}

interface VersionsProps {
  /** Undefined while the first read is running. */
  versions: ProductVersions | undefined;
}

function VersionList({ versions }: Readonly<VersionsProps>) {
  const copy = (
    <CopyToClipboard
      layout="inline"
      copyValue={() => formatVersions(versions)}
      disabled={!versions?.hub && !versions?.api}
      label="Copy versions"
      buttonClassName="size-7"
    />
  );

  return (
    <PanelSection icon={Tag} title="Versions" aside={copy}>
      <dl className="grid gap-2" aria-busy={versions === undefined}>
        <SummaryRow
          label="Hub"
          value={<VersionValue product="hub" versions={versions} />}
        />
        <SummaryRow
          label="API"
          value={<VersionValue product="api" versions={versions} />}
        />
      </dl>
    </PanelSection>
  );
}

function VersionValue({
  product,
  versions,
}: Readonly<VersionsProps & { product: keyof ProductVersions }>) {
  if (versions === undefined) {
    return (
      <>
        <Skeleton className="h-4 w-24 bg-foreground/10" />
        <span className="sr-only">Loading version</span>
      </>
    );
  }

  const build = versions[product];
  if (build?.version) {
    return (
      <ReleaseVersionLink
        product={product}
        version={build.version}
        source="about_dialog"
      />
    );
  }

  if (build?.branch || build?.commit) {
    return <BuildRef branch={build.branch} commit={build.commit} />;
  }

  return (
    <ReleaseVersionLink
      product={product}
      version={null}
      source="about_dialog"
    />
  );
}

function formatVersions(versions: ProductVersions | undefined): string {
  return [
    `Endatix Hub ${formatBuildIdentity(versions?.hub ?? null)}`,
    `Endatix API ${formatBuildIdentity(versions?.api ?? null)}`,
  ].join("\n");
}

function useTrackOpen(open: boolean) {
  const { trackEvent } = useTrackEvent();

  useEffect(() => {
    if (open) {
      trackEvent("about_dialog_opened");
    }
  }, [open, trackEvent]);
}
