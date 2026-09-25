/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { StyleSheet, Image, Link, Text, View } from "@react-pdf/renderer";
import { IFile, FileType, getFileType } from "@/lib/questions/file/file-type";
import {
  DocumentFileIcon,
  UnknownFileIcon,
  VideoFileIcon,
} from "@/features/pdf-export/submission/icons";
import { PDF_STYLES } from "@/features/pdf-export/submission/pdf-styles";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";
import AudioFileIcon from "./icons/audio-file-icon";
import { PDF_IMAGE_ROW_WIDTH } from "./pack-pdf-image-rows";

/** Name plus type under an image. The tile height includes this so a row can move intact. */
export const PDF_IMAGE_CAPTION_HEIGHT = 28;

/** Two non-image file cards share a row across the answer width. */
export const PDF_FILE_CARD_WIDTH = Math.floor((PDF_IMAGE_ROW_WIDTH - 8) / 2);

interface FileViewerProps {
  file: IFile;
  /** Explicit box in points. Required for images so Yoga cannot stretch them. */
  width?: number;
  height?: number;
}

export function PdfFileViewer({
  file,
  width,
  height,
}: FileViewerProps): React.ReactElement | null {
  const fileType = getFileType(file);

  switch (fileType) {
    case FileType.Image:
      return (
        <View
          wrap={false}
          style={{ width, height: (height ?? 0) + PDF_IMAGE_CAPTION_HEIGHT }}
        >
          <ImageLink file={file}>
            <View style={[styles.imageFrame, { width, height }]}>
              <Image
                src={file.content}
                style={{ width, height, objectFit: "contain" }}
              />
            </View>
          </ImageLink>
          <FileCaption file={file} />
        </View>
      );
    case FileType.Video:
      return <FileDetails file={file} icon={<VideoFileIcon />} />;
    case FileType.Audio:
      return <FileDetails file={file} icon={<AudioFileIcon />} />;
    case FileType.Document:
      return <FileDetails file={file} icon={<DocumentFileIcon />} />;
    case FileType.Unknown:
    default:
      return <FileDetails file={file} icon={<UnknownFileIcon />} />;
  }
}

/** The embedded copy is downscaled; the link opens the original upload. */
const ImageLink = ({
  file,
  children,
}: {
  file: IFile;
  children: React.ReactElement;
}) => (file.pdfLink ? <Link src={file.pdfLink}>{children}</Link> : children);

/** Keeps a long filename on one line until a space, instead of splitting the word. */
const keepWholeWords = (word: string) => [word];

const FileCaption = ({ file }: { file: IFile }) => (
  <View style={styles.caption}>
    <Text style={styles.fileName} hyphenationCallback={keepWholeWords}>
      {pdfPlainText(file.name) || "Untitled file"}
    </Text>
    {file.type ? (
      <Text style={styles.fileType} hyphenationCallback={keepWholeWords}>
        {file.type}
      </Text>
    ) : null}
  </View>
);

/**
 * A non-image file: the mark, the name and type, and one explicit "Open file" link.
 * Compact and half the answer width, so two sit side by side.
 */
const FileDetails = ({
  file,
  icon,
}: {
  file: IFile;
  icon: React.ReactNode;
}) => {
  return (
    <View style={[styles.fileCard, PDF_STYLES.mutedBorder]} wrap={false}>
      <View style={styles.fileIcon}>{icon}</View>
      <View style={styles.fileText}>
        <Text style={styles.fileName} hyphenationCallback={keepWholeWords}>
          {pdfPlainText(file.name) || "Untitled file"}
        </Text>
        {file.type ? (
          <Text style={styles.fileType} hyphenationCallback={keepWholeWords}>
            {file.type}
          </Text>
        ) : null}
        {file.pdfLink ? (
          <Link src={file.pdfLink} style={styles.fileLink}>
            Open file
          </Link>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  imageFrame: {
    backgroundColor: "#f4f4f5",
    borderRadius: 4,
    overflow: "hidden",
  },
  caption: {
    marginTop: 4,
  },
  fileName: {
    fontSize: 9,
    fontFamily: "Roboto-Bold",
    maxLines: 1,
    textOverflow: "ellipsis",
  },
  fileType: {
    fontSize: 8,
    color: "#71717a",
    marginTop: 1,
    maxLines: 1,
    textOverflow: "ellipsis",
  },
  fileCard: {
    width: PDF_FILE_CARD_WIDTH,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  fileIcon: {
    marginTop: 1,
  },
  fileText: {
    flex: 1,
  },
  fileLink: {
    fontSize: 9,
    color: "#1d4ed8",
    marginTop: 4,
  },
});

export default PdfFileViewer;
