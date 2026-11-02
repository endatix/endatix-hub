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
import { useTrackEvent } from "@/features/analytics/posthog/client";
import { formatBuildIdentity } from "@/lib/hosting/build-identity";
import { SURVEYJS_PACKAGES } from "@/lib/hosting/surveyjs-packages.mjs";
import type { ProductVersions } from "../../types";
import { useProductVersions } from "../use-product-versions.hook";
import { BuildRef } from "./build-ref";
import { ReleaseVersionLink } from "./release-version-link";
import { SurveyJsVersionGroup } from "./surveyjs-version-group";
import { VersionSkeleton } from "./version-skeleton";

interface AboutEndatixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutEndatixDialog({
  open,
  onOpenChange,
}: Readonly<AboutEndatixDialogProps>) {
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
        <VersionList versions={useProductVersions(open)} />
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

type EndatixProduct = "hub" | "api";

const ENDATIX_PRODUCTS = [
  { product: "hub", label: "Hub" },
  { product: "api", label: "API" },
] as const;

interface VersionsProps {
  /** Undefined while the first read is running. */
  versions: ProductVersions | undefined;
}

function VersionList({ versions }: Readonly<VersionsProps>) {
  return (
    <PanelSection
      icon={Tag}
      title="Versions"
      aside={<CopyVersions versions={versions} />}
    >
      <dl className="grid gap-2" aria-busy={versions === undefined}>
        {ENDATIX_PRODUCTS.map(({ product, label }) => (
          <SummaryRow
            key={product}
            label={label}
            value={<VersionValue product={product} versions={versions} />}
          />
        ))}
      </dl>
      <SurveyJsVersionGroup versions={versions?.surveyJs} />
    </PanelSection>
  );
}

function CopyVersions({ versions }: Readonly<VersionsProps>) {
  return (
    <CopyToClipboard
      layout="inline"
      copyValue={() => formatVersions(versions)}
      disabled={!versions?.hub && !versions?.api}
      label="Copy versions"
      buttonClassName="size-7"
    />
  );
}

function VersionValue({
  product,
  versions,
}: Readonly<VersionsProps & { product: EndatixProduct }>) {
  if (versions === undefined) {
    return <VersionSkeleton />;
  }

  return <ResolvedVersion product={product} build={versions[product]} />;
}

interface ResolvedVersionProps {
  product: EndatixProduct;
  build: ProductVersions[EndatixProduct];
}

function ResolvedVersion({ product, build }: Readonly<ResolvedVersionProps>) {
  if (build?.version) {
    return <NotesLink product={product} version={build.version} />;
  }

  if (build?.branch || build?.commit) {
    return <BuildRef branch={build.branch} commit={build.commit} />;
  }

  return <NotesLink product={product} version={null} />;
}

function NotesLink({
  product,
  version,
}: Readonly<{ product: EndatixProduct; version: string | null }>) {
  return (
    <ReleaseVersionLink
      product={product}
      version={version}
      source="about_dialog"
    />
  );
}

function formatVersions(versions: ProductVersions | undefined): string {
  return [
    `Endatix Hub ${formatBuildIdentity(versions?.hub ?? null)}`,
    `Endatix API ${formatBuildIdentity(versions?.api ?? null)}`,
    ...SURVEYJS_PACKAGES.map(
      (name) => `${name} ${versions?.surveyJs?.[name] ?? "unavailable"}`,
    ),
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
