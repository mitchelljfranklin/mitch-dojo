import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

import { registerPdfFonts } from "./fonts";

registerPdfFonts();

// Shared branded shell for generated PDFs. Light background by nature —
// the primary (light-background) logo variant is the right one here.
// Inline styles throughout: @react-pdf/renderer has no CSS-variable support.

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "NotoSans",
    color: "#18181b",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  brandName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#18181b",
  },
  brandLogo: {
    height: 40,
    maxWidth: 140,
    objectFit: "contain",
  },
  brandRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f4f5",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  muted: {
    color: "#71717a",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 8,
    color: "#a1a1aa",
    textAlign: "center",
  },
});

export type PdfBrand = {
  orgName: string;
  logoDataUrl: string | null;
  accentHex: string;
};

// Resolves the brand inputs for a PDF from the DB-backed settings. The logo
// is inlined as a data URL — the PDF renderer cannot fetch relative URLs.
export async function resolvePdfBrand(): Promise<PdfBrand> {
  const [{ getAppearanceSettings }, { getOrganizationSettings }, { storage }] =
    await Promise.all([
      import("@/lib/settings"),
      import("@/lib/settings"),
      import("@/lib/storage"),
    ]);

  const [appearance, organization] = await Promise.all([
    getAppearanceSettings(),
    getOrganizationSettings(),
  ]);

  let logoDataUrl: string | null = null;
  if (appearance.logoKey) {
    try {
      const file = await storage.read(appearance.logoKey);
      if (file) {
        const ext = appearance.logoKey.split(".").pop()?.toLowerCase() ?? "png";
        const mime =
          ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "gif"
              ? "image/gif"
              : ext === "webp"
                ? "image/webp"
                : "image/png";
        logoDataUrl = `data:${mime};base64,${Buffer.from(file).toString("base64")}`;
      }
    } catch {
      // A missing/unreadable logo degrades to a text-only header.
    }
  }

  return {
    orgName: organization.name,
    logoDataUrl,
    accentHex: appearance.primaryHex || "#18181b",
  };
}

export function PdfBrandHeader({ brand }: { brand: PdfBrand }) {
  return (
    <View>
      <View style={pdfStyles.brandRow}>
        <Text style={pdfStyles.brandName}>{brand.orgName}</Text>
        {brand.logoDataUrl ? (
          <Image src={brand.logoDataUrl} style={pdfStyles.brandLogo} />
        ) : null}
      </View>
      <View style={pdfStyles.brandRule} />
    </View>
  );
}
