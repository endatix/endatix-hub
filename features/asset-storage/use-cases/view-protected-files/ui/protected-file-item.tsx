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

  private downloadFileFromContainer(
    event: React.MouseEvent<HTMLElement>,
  ): void {
    this.question.doDownloadFileFromContainer(
      event.nativeEvent,
    );
  }

  private removeFile(
    val: { content?: string; name?: string },
    event: React.MouseEvent<HTMLElement>,
  ): void {
    event.stopPropagation();
    this.question.doRemoveFile(val, event.nativeEvent);
  }

  private renderFileLink(
    content: string,
    val: { content?: string; name?: string },
    linkProps: React.AnchorHTMLAttributes<HTMLAnchorElement>,
  ): React.JSX.Element {
    if (isPrivateStorageContext(this.context) && content.length > 0) {
      return (
        <StoragePresignedLink href={content} {...linkProps}>
          {val.name}
        </StoragePresignedLink>
      );
    }

    return (
      <a href={content} {...linkProps}>
        {val.name}
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

    const content = val.content ?? "";
    const linkProps = {
      onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
        this.question.doDownloadFile(event.nativeEvent, val);
      },
      title: val.name,
      download: val.name,
      target: "_blank" as const,
      rel: "noreferrer" as const,
      style: { width: this.question.imageWidth },
    };

    return (
      <div className={className}>
        {this.renderFileLink(content, val, linkProps)}
      </div>
    );
  }

  private renderPreviewContent(
    content: string,
    val: { content?: string; name?: string },
  ): React.JSX.Element | null {
    if (this.question.canPreviewImage(val)) {
      return (
        <StoragePresignedImage
          src={content}
          style={{
            height: this.question.imageHeight,
            width: this.question.imageWidth,
          }}
          alt="File preview"
        />
      );
    }

    if (!this.question.cssClasses.defaultImage) {
      return null;
    }

    return (
      <SvgIcon
        iconName={this.question.cssClasses.defaultImageIconId}
        size="auto"
        className={this.question.cssClasses.defaultImage}
      />
    );
  }

  private renderRemoveButton(val: {
    content?: string;
    name?: string;
  }): React.JSX.Element | null {
    if (!val.name || this.question.isReadOnly) {
      return null;
    }

    return (
      <button
        aria-label={`Remove ${val.name}`}
        className={this.question.getRemoveButtonCss()}
        onClick={(event) => this.removeFile(val, event)}
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
          <button
            aria-label={val.name ? `Download ${val.name}` : "Download file"}
            className={this.question.cssClasses.previewItem}
            onClick={(event) => this.downloadFileFromContainer(event)}
            type="button"
          >
            {this.renderPreviewContent(content, val)}
          </button>
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
