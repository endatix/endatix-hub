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

/** Name plus type under an image. The tile height includes this so a row can move intact. */
export const PDF_IMAGE_CAPTION_HEIGHT = 28;

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
          <View style={[styles.imageFrame, { width, height }]}>
            <Image
              src={file.content}
              style={{ width, height, objectFit: "contain" }}
            />
          </View>
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

const FileDetails = ({
  file,
  icon,
}: {
  file: IFile;
  icon: React.ReactNode;
}) => {
  return (
    <View style={[styles.fileCard, PDF_STYLES.mutedBorder]} wrap={false}>
      <FileCaption file={file} />
      <View style={styles.fileLinkRow}>
        {icon}
        {file.content ? (
          <Link src={file.content} style={styles.fileLink}>
            Link to file
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
  },
  fileType: {
    fontSize: 8,
    color: "#71717a",
    marginTop: 1,
  },
  fileCard: {
    width: 280,
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  fileLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  fileLink: {
    fontSize: 9,
    color: "#1d4ed8",
  },
});

export default PdfFileViewer;
