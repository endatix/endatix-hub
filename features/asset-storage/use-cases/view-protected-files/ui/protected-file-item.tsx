"use client";

import { AssetStorageContext } from "@/features/asset-storage/ui/asset-storage.context";
import { StoragePresignedImage } from "@/features/asset-storage/ui/storage-presigned-image";
import { StoragePresignedLink } from "@/features/asset-storage/ui/storage-presigned-link";
import * as React from "react";
import { QuestionFileModel } from "survey-core";
import { ReactElementFactory, SurveyFileItem, SvgIcon } from "survey-react-ui";
import { isPrivateStorageContext } from "./protected-storage-media";

let isRegistered = false;

class ProtectedSurveyFileItem extends SurveyFileItem {
  declare context: React.ContextType<typeof AssetStorageContext>;

  protected get question(): QuestionFileModel {
    return this.props.question;
  }

  protected get item(): { content?: string; name?: string } {
    return this.props.item;
  }

  /**
   * SurveyJS `SurveyFileItem` puts `onClick` on a `<span>` and
   * `doDownloadFileFromContainer` then `click()`s the first inner `<a>`.
   * That span cannot be a `<button>`: it already wraps a filename `<a>` and
   * a Remove `<button>`. We keep the span as layout and attach download to
   * native `<a>`s instead (filename + preview).
   * @see https://github.com/surveyjs/survey-library/blob/73740ea743ef5cb520a13292d5063c922e9e5ad2/packages/survey-react-ui/src/components/file/file-item.tsx
   */
  private renderFileLink(
    content: string,
    val: { content?: string; name?: string },
    children: React.ReactNode,
    extraProps?: React.AnchorHTMLAttributes<HTMLAnchorElement>,
  ): React.JSX.Element {
    const linkProps: React.AnchorHTMLAttributes<HTMLAnchorElement> = {
      onClick: (event) => {
        this.question.doDownloadFile(event.nativeEvent, val);
      },
      title: val.name,
      download: val.name,
      target: "_blank",
      rel: "noreferrer",
      style: { width: this.question.imageWidth },
      ...extraProps,
    };

    if (isPrivateStorageContext(this.context) && content.length > 0) {
      return (
        <StoragePresignedLink href={content} {...linkProps}>
          {children}
        </StoragePresignedLink>
      );
    }

    return (
      <a href={content} {...linkProps}>
        {children}
      </a>
    );
  }

  protected renderFileSign(
    className: string,
    val: { content?: string; name?: string },
  ): React.JSX.Element | null {
    if (!className || !val.name) {
      return null;
    }

    return (
      <div className={className}>
        {this.renderFileLink(val.content ?? "", val, val.name)}
      </div>
    );
  }

  private renderPreviewContent(
    content: string,
    val: { content?: string; name?: string },
  ): React.JSX.Element | null {
    let preview: React.JSX.Element | null = null;
    if (this.question.canPreviewImage(val)) {
      preview = (
        <StoragePresignedImage
          src={content}
          style={{
            height: this.question.imageHeight,
            width: this.question.imageWidth,
          }}
          alt=""
        />
      );
    } else if (this.question.cssClasses.defaultImage) {
      preview = (
        <SvgIcon
          iconName={this.question.cssClasses.defaultImageIconId}
          size="auto"
          className={this.question.cssClasses.defaultImage}
        />
      );
    }

    if (!preview) {
      return null;
    }

    return this.renderFileLink(content, val, preview, {
      "aria-hidden": true,
      tabIndex: -1,
    });
  }

  /**
   * SurveyJS v3 dropped `getRemoveButtonCss`. Official `SurveyFileItem` uses
   * `getRemoveFileButton` + `SurveyAction`; `SurveyAction` is not a public
   * export, so we bind the same Action + `cssClasses.removeFileButton`.
   */
  private renderRemoveButton(val: {
    content?: string;
    name?: string;
  }): React.JSX.Element | null {
    if (!val.name || this.question.isReadOnly) {
      return null;
    }

    const removeAction = this.question.getRemoveFileButton(val);
    if (!removeAction) {
      return null;
    }

    return (
      <button
        aria-label={`Remove ${val.name}`}
        className={this.question.cssClasses.removeFileButton}
        onClick={(event) => {
          event.stopPropagation();
          removeAction.action();
        }}
        type="button"
      >
        <span className={this.question.cssClasses.removeFile}>
          {this.question.removeFileCaption}
        </span>
        {this.renderRemoveIcon()}
      </button>
    );
  }

  private renderRemoveIcon(): React.JSX.Element | null {
    if (!this.question.cssClasses.removeFileSvgIconId) {
      return null;
    }

    return (
      <SvgIcon
        title={this.question.removeFileCaption}
        iconName={this.question.cssClasses.removeFileSvgIconId}
        size="auto"
        className={this.question.cssClasses.removeFileSvg}
      />
    );
  }

  protected renderElement(): React.JSX.Element | null {
    if (!isPrivateStorageContext(this.context)) {
      return super.renderElement();
    }

    const val = this.item;
    const content = val.content ?? "";

    return (
      <span className={this.question.cssClasses.previewItem}>
        {this.renderFileSign(this.question.cssClasses.fileSign, val)}
        <div className={this.question.getImageWrapperCss(val)}>
          {this.renderPreviewContent(content, val)}
          {this.renderRemoveButton(val)}
        </div>
        {this.renderFileSign(this.question.cssClasses.fileSignBottom, val)}
      </span>
    );
  }
}

function registerProtectedFileItem(): void {
  if (globalThis.window === undefined || isRegistered) {
    return;
  }

  ReactElementFactory.Instance.registerElement("sv-file-item", (props) => {
    return React.createElement(ProtectedSurveyFileItem, props);
  });

  ProtectedSurveyFileItem.contextType = AssetStorageContext;

  isRegistered = true;
}

export { ProtectedSurveyFileItem, registerProtectedFileItem };
