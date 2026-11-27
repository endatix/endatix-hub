import { Fragment, useEffect, useState, type ComponentType, type ReactNode } from "react";
import type { SurveyCreatorModel } from "survey-creator-core";
import { bindChoiceGridImages } from "./choice-grid-images";
import { ImageSettingsDialog } from "./image-settings-dialog";
import { OpenImageSettings, type ImageTarget } from "./image-settings-target";

interface Props { creator: SurveyCreatorModel; children: ReactNode; PreviewDisplay?: ComponentType<{children: ReactNode}> }

export function ChoiceImageSettings({ creator, children, PreviewDisplay = Fragment }: Readonly<Props>) {
  const [target, open] = useState<ImageTarget | null>(null);
  useEffect(() => bindChoiceGridImages(creator, open), [creator]);
  return <OpenImageSettings.Provider value={open}>
    {children}
    {target && <ImageSettingsDialog target={target} PreviewDisplay={PreviewDisplay} close={() => open(null)} />}
  </OpenImageSettings.Provider>;
}
