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
        {isPrivateStorageContext(this.context) && content.length > 0 ? (
          <StoragePresignedLink href={content} {...linkProps}>
            {val.name}
          </StoragePresignedLink>
        ) : (
          <a href={content} {...linkProps}>
            {val.name}
          </a>
        )}
      </div>
    );
  }

  protected renderElement(): React.JSX.Element | null {
    if (!isPrivateStorageContext(this.context)) {
      return super.renderElement();
    }

    const val = this.item;
    const content = val.content ?? "";

    return (
      <span
        className={this.question.cssClasses.previewItem}
        onClick={(event) =>
          this.question.doDownloadFileFromContainer(event.nativeEvent)
        }
      >
        {this.renderFileSign(this.question.cssClasses.fileSign, val)}
        <div className={this.question.getImageWrapperCss(val)}>
          {this.question.canPreviewImage(val) ? (
            <StoragePresignedImage
              src={content}
              style={{
                height: this.question.imageHeight,
                width: this.question.imageWidth,
              }}
              alt="File preview"
            />
          ) : this.question.cssClasses.defaultImage ? (
            <SvgIcon
              iconName={this.question.cssClasses.defaultImageIconId}
              size="auto"
              className={this.question.cssClasses.defaultImage}
            />
          ) : null}
          {val.name && !this.question.isReadOnly ? (
            <div
              className={this.question.getRemoveButtonCss()}
              onClick={(event) =>
                this.question.doRemoveFile(val, event.nativeEvent)
              }
            >
              <span className={this.question.cssClasses.removeFile}>
                {this.question.removeFileCaption}
              </span>
              {this.question.cssClasses.removeFileSvgIconId ? (
                <SvgIcon
                  title={this.question.removeFileCaption}
                  iconName={this.question.cssClasses.removeFileSvgIconId}
                  size="auto"
                  className={this.question.cssClasses.removeFileSvg}
                />
              ) : null}
            </div>
          ) : null}
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
