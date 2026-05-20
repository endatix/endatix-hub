import { AssetStorageContext } from "@/features/asset-storage/ui/asset-storage.context";
import { enrichImagesInContainer } from "@/features/asset-storage/use-cases/view-protected-files/enrich-image-urls";
import * as React from "react";
import {
  ImageItemValue,
  QuestionImagePickerModel,
  SurveyModel,
} from "survey-core";
import {
  ReactElementFactory,
  ReactQuestionFactory,
  ReactSurveyElement,
  ReactSurveyElementsWrapper,
  SurveyElementBase,
  SurveyQuestionImagePicker,
  SvgIcon,
} from "survey-react-ui";
import { ImageItemValueAdornerComponent } from "survey-creator-react";
import {
  isPrivateStorageContext,
  StoragePresignedImage,
  toCssObjectFit,
} from "./protected-storage-media";

let isRegistered = false;

type ImagePickerItemProps = {
  question: QuestionImagePickerModel;
  item: ImageItemValue;
  cssClasses: Record<string, string>;
};

/**
 * Image picker choice item with presigned GET for private storage (Survey-aligned structure).
 */
class ProtectedImagePickerItem extends ReactSurveyElement<ImagePickerItemProps> {
  constructor(props: ImagePickerItemProps) {
    super(props);
    this.handleOnChange = this.handleOnChange.bind(this);
  }

  protected getStateElement(): ImageItemValue {
    return this.item;
  }

  componentDidMount(): void {
    super.componentDidMount();
    this.reactOnStrChanged();
  }

  componentWillUnmount(): void {
    super.componentWillUnmount();
    this.item.locImageLink.onChanged = () => {};
  }

  componentDidUpdate(
    prevProps: Readonly<ImagePickerItemProps>,
    prevState: Readonly<unknown>,
  ): void {
    super.componentDidUpdate(prevProps, prevState);
    this.reactOnStrChanged();
  }

  private reactOnStrChanged(): void {
    this.item.locImageLink.onChanged = () => {
      this.forceUpdate();
    };
  }

  protected get cssClasses(): Record<string, string> {
    return this.props.cssClasses;
  }

  protected get item(): ImageItemValue {
    return this.props.item;
  }

  protected get question(): QuestionImagePickerModel {
    return this.props.question;
  }

  handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    if (this.question.isReadOnlyAttr) {
      return;
    }
    if (this.question.multiSelect) {
      if (event.target.checked) {
        this.question.value = this.question.value.concat(event.target.value);
      } else {
        const currValue = this.question.value;
        currValue.splice(this.question.value.indexOf(event.target.value), 1);
        this.question.value = currValue;
      }
    } else {
      this.question.value = event.target.value;
    }
    this.setState({ value: this.question.value });
  }

  protected renderElement(): React.JSX.Element {
    const item = this.item;
    const question = this.question;
    const cssClasses = this.cssClasses;
    const isChecked = question.isItemSelected(item);
    const itemClass = question.getItemClass(item);
    let text: React.JSX.Element | null = null;
    if (question.showLabel) {
      text = (
        <span className={question.cssClasses.itemText}>
          {item.text
            ? SurveyElementBase.renderLocString(item.locText)
            : item.value}
        </span>
      );
    }

    const style: React.CSSProperties = {
      objectFit: toCssObjectFit(question.imageFit),
    };
    let control: React.JSX.Element | null = null;
    const imageSrc =
      item.locImageLink.renderedHtml ||
      (item as ImageItemValue & { imageLink?: string }).imageLink ||
      "";

    if (imageSrc.length > 0 && question.contentMode === "image") {
      control = (
        <StoragePresignedImage
          className={cssClasses.image}
          src={imageSrc}
          width={question.renderedImageWidth}
          height={question.renderedImageHeight}
          alt={item.locText.renderedHtml}
          style={style}
          onLoad={(event) => {
            question.onContentLoaded(item, event.nativeEvent);
          }}
          onError={() => {
            item.onErrorHandler();
          }}
        />
      );
    }
    if (imageSrc.length > 0 && question.contentMode === "video") {
      control = (
        <video
          controls
          muted
          className={cssClasses.image}
          src={imageSrc}
          width={question.renderedImageWidth}
          height={question.renderedImageHeight}
          style={style}
          onLoadedMetadata={(event) => {
            question.onContentLoaded(item, event.nativeEvent);
          }}
          onError={() => {
            item.onErrorHandler();
          }}
        />
      );
    }
    if (imageSrc.length === 0 || item.contentNotLoaded) {
      const placeholderStyle: React.CSSProperties = {
        width: question.renderedImageWidth,
        height: question.renderedImageHeight,
        objectFit: toCssObjectFit(question.imageFit),
      };
      control = (
        <div className={cssClasses.itemNoImage} style={placeholderStyle}>
          {cssClasses.itemNoImageSvgIcon ? (
            <SvgIcon
              className={cssClasses.itemNoImageSvgIcon}
              iconName={question.cssClasses.itemNoImageSvgIconId}
              size={48}
            />
          ) : null}
        </div>
      );
    }

    return (
      <div className={itemClass}>
        <label className={cssClasses.label}>
          <input
            className={cssClasses.itemControl}
            id={question.getItemId(item)}
            type={question.inputType}
            name={question.questionName}
            checked={isChecked}
            value={item.value}
            disabled={!question.getItemEnabled(item)}
            readOnly={question.isReadOnlyAttr}
            onChange={this.handleOnChange}
            required={question.inputRequiredAttribute ?? undefined}
            aria-label={item.locText.renderedHtml}
            aria-invalid={question.ariaInvalid}
            aria-errormessage={question.ariaErrormessage}
          />
          <div className={question.cssClasses.itemDecorator}>
            <div className={question.cssClasses.imageContainer}>
              {question.cssClasses.checkedItemDecorator ? (
                <span
                  className={question.cssClasses.checkedItemDecorator}
                  aria-hidden="true"
                >
                  {question.cssClasses.checkedItemSvgIconId ? (
                    <SvgIcon
                      size="auto"
                      className={question.cssClasses.checkedItemSvgIcon}
                      iconName={question.cssClasses.checkedItemSvgIconId}
                    />
                  ) : null}
                </span>
              ) : null}
              {control}
            </div>
            {text}
          </div>
        </label>
      </div>
    );
  }
}

class ProtectedSurveyQuestionImagePicker extends SurveyQuestionImagePicker {
  declare context: React.ContextType<typeof AssetStorageContext>;

  protected renderItem(
    item: ImageItemValue,
    cssClasses: Record<string, string>,
  ): React.JSX.Element {
    if (!isPrivateStorageContext(this.context)) {
      return super.renderItem(item, cssClasses);
    }

    const renderedItem = React.createElement(ProtectedImagePickerItem, {
      key: item.uniqueId,
      question: this.question,
      item,
      cssClasses,
    });
    const survey = this.question?.survey;
    if (survey) {
      const wrappedItem = ReactSurveyElementsWrapper.wrapItemValue(
        survey as unknown as SurveyModel,
        renderedItem,
        this.question,
        item,
      );
      return wrappedItem ?? renderedItem;
    }
    return renderedItem;
  }
}

class ProtectedImageItemValueAdorner extends ImageItemValueAdornerComponent {
  declare context: React.ContextType<typeof AssetStorageContext>;

  private readUrlCacheVersionSeen = 0;

  componentDidMount(): void {
    super.componentDidMount();
    this.updateImages();
  }

  componentDidUpdate(
    prevProps: Readonly<unknown>,
    prevState: Readonly<unknown>,
  ): void {
    super.componentDidUpdate(prevProps, prevState);
    const cacheVersion = this.context?.readUrlCacheVersion ?? 0;
    if (cacheVersion === this.readUrlCacheVersionSeen) {
      return;
    }
    this.readUrlCacheVersionSeen = cacheVersion;
    this.updateImages();
  }

  private updateImages(): void {
    setTimeout(() => {
      const context = this.context;
      if (!context) {
        return;
      }

      const root = this.model.itemsRoot;
      const config = context.config;

      if (config?.isEnabled && config.isPrivate) {
        enrichImagesInContainer(
          root,
          (url) => context.getCachedPrivateReadUrl(url) ?? url,
          config.hostName,
        );
      }
    }, 0);
  }
}

function registerProtectedImageItem(): void {
  if (globalThis.window === undefined || isRegistered) {
    return;
  }

  ReactQuestionFactory.Instance.registerQuestion("imagepicker", (props) => {
    return React.createElement(ProtectedSurveyQuestionImagePicker, props);
  });

  ReactElementFactory.Instance.registerElement(
    "svc-image-item-value",
    (props) => {
      return React.createElement(ProtectedImageItemValueAdorner, props);
    },
  );

  ProtectedImageItemValueAdorner.contextType = AssetStorageContext;
  ProtectedSurveyQuestionImagePicker.contextType = AssetStorageContext;

  isRegistered = true;
}

export {
  ProtectedImagePickerItem,
  ProtectedSurveyQuestionImagePicker,
  ProtectedImageItemValueAdorner,
  registerProtectedImageItem,
};
