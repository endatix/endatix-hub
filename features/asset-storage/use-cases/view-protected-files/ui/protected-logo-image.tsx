import { AssetStorageContext } from "@/features/asset-storage/ui/asset-storage.context";
import * as React from "react";
import { LogoImageViewModel, SurveyCreatorModel } from "survey-creator-core";
import { LogoImageComponent } from "survey-creator-react";
import { LogoImage, ReactElementFactory, SurveyModel } from "survey-react-ui";
import {
  isPrivateStorageContext,
  toCssObjectFit,
} from "./protected-storage-media";
import { StoragePresignedImage } from "@/features/asset-storage/ui/storage-presigned-image";

let isRegistered = false;

interface ILogoImageComponentProps {
  data: SurveyCreatorModel;
}

interface ILogoImageProps {
  data: SurveyModel;
}

class ProtectedLogoImageComponent extends LogoImageComponent {
  constructor(props: ILogoImageComponentProps) {
    super(props);
  }

  protected getViewModel(): LogoImageViewModel {
    return this.getStateElement() as LogoImageViewModel;
  }

  override renderImage(): React.JSX.Element {
    return (
      <div className={this.getViewModel().containerCss}>
        {super.renderButtons()}
        <ProtectedLogoImage data={this.props.data.survey} />
      </div>
    );
  }
}

class ProtectedLogoImage extends LogoImage {
  declare context: React.ContextType<typeof AssetStorageContext>;

  render(): React.JSX.Element {
    if (!this.props?.data) {
      return super.render();
    }

    const survey = this.props.data;
    const logoUrl = survey.locLogo?.renderedHtml ?? "";

    if (!isPrivateStorageContext(this.context) || logoUrl.length === 0) {
      return super.render();
    }

    return (
      <div className={survey.logoClassNames}>
        <StoragePresignedImage
          className={survey.css.logoImage}
          src={logoUrl}
          alt={survey.locTitle.renderedHtml}
          width={survey.renderedLogoWidth}
          height={survey.renderedLogoHeight}
          style={{
            objectFit: toCssObjectFit(survey.logoFit),
            width: survey.renderedStyleLogoWidth,
            height: survey.renderedStyleLogoHeight,
          }}
        />
      </div>
    );
  }
}

function registerProtectedLogoImage(): void {
  if (globalThis.window === undefined || isRegistered) {
    return;
  }

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
