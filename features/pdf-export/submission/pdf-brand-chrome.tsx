import { Image as PdfImage, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfBrandIdentity } from "@/lib/branding/pdf.server";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";

type BrandProps = { readonly identity: PdfBrandIdentity };

export function PdfBrandHeader({ identity }: BrandProps) {
  const { logo } = identity;
  const imageStyle = logo?.kind === "icon" ? styles.icon : styles.logo;
  return (
    <View wrap={false} style={styles.header}>
      <View style={styles.row}>
        {logo && <PdfImage src={logo.src} style={imageStyle} />}
        {logo?.kind !== "wordmark" && (
          <Text>{pdfPlainText(identity.productName)}</Text>
        )}
      </View>
      {identity.accentBar && (
        <View style={{ height: 3, backgroundColor: identity.accentBar }} />
      )}
    </View>
  );
}

export function PdfBrandFooter({ identity }: BrandProps) {
  return (
    <Text fixed style={styles.footer}>
      {pdfPlainText(identity.footerText)}
    </Text>
  );
}

const chromeColors = { backgroundColor: "#ffffff", color: "#222222" };
const styles = StyleSheet.create({
  header: { marginBottom: 10, ...chromeColors },
  row: { flexDirection: "row", gap: 12, alignItems: "center", padding: 8 },
  logo: { width: 100, height: 30, objectFit: "contain" },
  icon: { width: 24, height: 24, objectFit: "contain" },
  footer: {
    ...chromeColors,
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 12,
    fontSize: 9,
  },
});
