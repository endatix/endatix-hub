/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AssetStorageContext,
  enrichImageInJSX,
} from "@/features/asset-storage/client";
import * as React from "react";
import { LogoImageViewModel, SurveyCreatorModel } from "survey-creator-core";
import { LogoImageComponent } from "survey-creator-react";
import { LogoImage, ReactElementFactory, SurveyModel } from "survey-react-ui";

let isRegistered = false;

interface ILogoImageComponentProps {
  data: SurveyCreatorModel;
}

interface ILogoImageProps {
  data: SurveyModel;
}

/**
 * A custom logo image adorner that wraps the LogoImageComponent and ensures logos in private storage
 * are rendered with a SAS token.
 * To be used within the Survey Creator only.
 */
class ProtectedLogoImageComponent extends LogoImageComponent {
  constructor(props: ILogoImageComponentProps) {
    super(props);
  }

  protected getViewModel(): LogoImageViewModel {
    return this.getStateElement() as LogoImageViewModel;
  }

  override renderImage() {
    return (
      <div className={this.getViewModel().containerCss}>
        {super.renderButtons()}
        <ProtectedLogoImage data={this.props.data.survey}></ProtectedLogoImage>
      </div>
    );
  }
}

/**
 * A custom logo image component that ensures logos in private storage
 * are rendered with a SAS token.
 * To be used within the Survey Creator only.
 */
class ProtectedLogoImage extends LogoImage {
  declare context: React.ContextType<typeof AssetStorageContext>;

  constructor(props: ILogoImageProps) {
    super(props);
  }

  private get surveyModel(): SurveyModel | undefined {
    return this.props?.data;
  }

  render(): React.JSX.Element {
    if (!this.props?.data) {
      return super.render();
    }
    const ctx = this.context;
    const logoUrl = this.surveyModel?.locLogo?.renderedHtml;
    const isPrivatedStorageEnabled =
      ctx?.config?.isEnabled && ctx.config.isPrivate && ctx.resolveStorageUrl;

    if (!isPrivatedStorageEnabled || !logoUrl) {
      return super.render();
    }

    const baseElement = super.render();
    return enrichImageInJSX(baseElement, ctx.resolveStorageUrl);
  }
}

function registerProtectedLogoImage() {
  if (globalThis.window === undefined || isRegistered) return;

  ReactElementFactory.Instance.registerElement(
    "svc-logo-image",
    (props: ILogoImageComponentProps) => {
      return React.createElement(ProtectedLogoImageComponent, props);
    },
  );

  ReactElementFactory.Instance.registerElement(
    "sv-logo-image",
    (props: ILogoImageProps) => {
      return React.createElement(ProtectedLogoImage, props);
    },
  );
  ProtectedLogoImage.contextType = AssetStorageContext;

  isRegistered = true;
}

export {
  ProtectedLogoImage,
  ProtectedLogoImageComponent,
  registerProtectedLogoImage,
};
