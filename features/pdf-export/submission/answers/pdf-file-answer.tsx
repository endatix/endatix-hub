import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import {
  PDF_IMAGE_CAPTION_HEIGHT,
  PdfFileViewer,
} from "../pdf-file-viewer";
import { packPdfImageRows } from "../pack-pdf-image-rows";
import { Question, QuestionFileModel } from "survey-core";
import { FileType, getFileType, IFile } from "@/lib/questions/file/file-type";
interface FileAnswerProps {
  question: QuestionFileModel;
}

/** How much room the first image row needs, so the question title can move with it. */
export function firstFileRowPresence(question: Question): number {
  const files: IFile[] = Array.isArray(question?.value) ? question.value : [];
  const ratios = files.flatMap((file) => {
    const ratio = imageRatio(file);
    return ratio === undefined ? [] : [ratio];
  });
  const [firstRow] = packPdfImageRows(ratios);
  if (!firstRow) {
    return 80;
  }
  const imageHeight = Math.max(...firstRow.map((slot) => slot.height));
  return imageHeight + PDF_IMAGE_CAPTION_HEIGHT + 8;
}

export function PdfFileAnswer({
  question,
}: FileAnswerProps): React.ReactElement {
  const files: IFile[] = Array.isArray(question?.value) ? question?.value : [];
  const imageIndexes = files.flatMap((file, index) =>
    imageRatio(file) === undefined ? [] : [index],
  );
  const ratios = imageIndexes.map((index) => imageRatio(files[index])!);
  const rows = packPdfImageRows(ratios);

  return (
    <View style={styles.container}>
      {files.length === 0 ? (
        <Text style={styles.noFiles}>No files uploaded</Text>
      ) : (
        <View style={styles.filesContainer}>
          {rows.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[
                styles.imageRow,
                {
                  height:
                    Math.max(...row.map((slot) => slot.height)) +
                    PDF_IMAGE_CAPTION_HEIGHT,
                },
              ]}
              wrap={false}
            >
              {row.map((slot) => (
                <PdfFileViewer
                  key={imageIndexes[slot.index]}
                  file={files[imageIndexes[slot.index]]}
                  width={slot.width}
                  height={slot.height}
                />
              ))}
            </View>
          ))}
          {files.map((file, index) =>
            imageRatio(file) === undefined ? (
              <PdfFileViewer key={index} file={file} />
            ) : null,
          )}
        </View>
      )}
    </View>
  );
}

function imageRatio(file: IFile): number | undefined {
  if (getFileType(file) !== FileType.Image) {
    return undefined;
  }
  if (!file.pdfWidth || !file.pdfHeight) {
    return 1;
  }
  return file.pdfWidth / file.pdfHeight;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "bold",
  },
  noFiles: {
    fontSize: 12,
    color: "gray",
  },
  filesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
});

export default PdfFileAnswer;
