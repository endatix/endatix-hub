import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PDF_IMAGE_CAPTION_HEIGHT, PdfFileViewer } from "../pdf-file-viewer";
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
  const otherIndexes = files.flatMap((file, index) =>
    imageRatio(file) === undefined ? [index] : [],
  );
  const ratios = imageIndexes.map((index) => imageRatio(files[index])!);
  const rows = packPdfImageRows(ratios);

  return (
    <View style={styles.container}>
      {files.length === 0 ? (
        <Text style={styles.noFiles}>No files uploaded</Text>
      ) : (
        <View style={styles.filesContainer}>
          {rows.map((row) => {
            const fileKeys = row.map((slot) => imageIndexes[slot.index]);
            return (
              <View
                key={fileKeys.join("-")}
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
            );
          })}
          {pairs(otherIndexes).map((pair) => (
            <View key={pair.join("-")} style={styles.fileRow} wrap={false}>
              {pair.map((index) => (
                <PdfFileViewer key={index} file={files[index]} />
              ))}
            </View>
          ))}
          {files.some((file) => file.pdfLinkIsTemporary) ? (
            <Text style={styles.temporaryLinksNote}>
              File links in this PDF are temporary and stop working shortly
              after it was exported.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function pairs<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    result.push(items.slice(index, index + 2));
  }
  return result;
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
  fileRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  temporaryLinksNote: {
    fontSize: 8,
    color: "#71717a",
  },
});

export default PdfFileAnswer;
