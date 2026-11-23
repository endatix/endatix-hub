import { Image as PdfImage, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfBrandIdentity } from "@/lib/branding/pdf.server";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";

export function PdfBrandHeader({ identity }: { identity: PdfBrandIdentity }) {
  return (
    <View wrap={false} style={styles.header}>
      <View style={styles.row}>
        {identity.logo && <PdfImage src={identity.logo} style={styles.logo} />}
        <Text>{pdfPlainText(identity.productName)}</Text>
      </View>
      {identity.accentBar && (
        <View style={{ height: 3, backgroundColor: identity.accentBar }} />
      )}
    </View>
  );
}

export function PdfBrandFooter({ identity }: { identity: PdfBrandIdentity }) {
  return (
    <Text fixed style={styles.footer}>
      {pdfPlainText(identity.footerText)}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 10, backgroundColor: "#ffffff", color: "#222222" },
  row: { flexDirection: "row", gap: 12, alignItems: "center", padding: 8 },
  logo: { width: 100, height: 30, objectFit: "contain" },
  footer: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 12,
    fontSize: 9,
  },
});
