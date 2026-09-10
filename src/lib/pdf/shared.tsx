import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";

// Shared building blocks for every branded PDF export in the app (see
// checkpoint/pdf/route.ts for the first one, and each <space>/pdf/route.ts
// for the rest). Server-only -- rendered via renderToBuffer inside a route
// handler, never imported into a client bundle. Colors are the same hex
// values globals.css defines for --color-coral/-ink/-paper/-line/-muted
// (see src/app/globals.css) -- @react-pdf/renderer can't read CSS custom
// properties, so they're copied here as plain literals instead of
// re-deriving a token system just for these documents. A real uploaded
// workspace or project theme overrides the accent color and logo per
// document -- see resolvePdfAccentColor (resolveAccent.ts) and
// resolvePdfLogo (resolveLogo.ts) -- but the neutral palette (ink/paper/
// line/muted) always stays the app's own, matching every other export's
// look.
export const PDF_COLORS = {
  coral: "#f2583e",
  coralStrong: "#b23a22",
  ink: "#1f2738",
  paper: "#fafaf7",
  line: "#e5e2da",
  muted: "#6e7484",
  muted2: "#9aa0ae",
  ok: "#2f5d3f",
  warn: "#8a5a16",
  error: "#8c3520",
};

export const pdfStyles = StyleSheet.create({
  page: { backgroundColor: "#ffffff", paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontSize: 10, color: PDF_COLORS.ink },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  logo: { width: 20, height: 20 },
  wordmark: { fontSize: 12, fontWeight: 700, color: PDF_COLORS.ink },
  rule: { width: 34, height: 3, backgroundColor: PDF_COLORS.coral, borderRadius: 2, marginBottom: 10 },
  eyebrow: { fontSize: 8, letterSpacing: 1, color: PDF_COLORS.muted2, marginBottom: 6, textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: 700, color: PDF_COLORS.ink, marginBottom: 6 },
  description: { fontSize: 10.5, color: PDF_COLORS.muted, lineHeight: 1.5, marginBottom: 16, maxWidth: 460 },
  infoPanel: { borderWidth: 1, borderColor: PDF_COLORS.line, borderRadius: 8, padding: 14, backgroundColor: PDF_COLORS.paper, gap: 8 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  infoLabel: { fontSize: 8, letterSpacing: 0.6, color: PDF_COLORS.muted2, textTransform: "uppercase" },
  infoValue: { fontSize: 10.5, fontWeight: 700, color: PDF_COLORS.ink },
  sectionHeading: { fontSize: 13, fontWeight: 700, color: PDF_COLORS.ink, marginTop: 18, marginBottom: 10 },
  card: { borderWidth: 1, borderColor: PDF_COLORS.line, borderRadius: 8, padding: 10, marginBottom: 8 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: { borderWidth: 1, borderColor: PDF_COLORS.line, borderRadius: 8, padding: 10, width: "31%" },
  statValue: { fontSize: 16, fontWeight: 700, color: PDF_COLORS.coral },
  statLabel: { fontSize: 9, fontWeight: 700, color: PDF_COLORS.ink, marginTop: 2 },
  statNote: { fontSize: 8, color: PDF_COLORS.muted, marginTop: 3, lineHeight: 1.4 },
  table: { borderWidth: 1, borderColor: PDF_COLORS.line, borderRadius: 8, overflow: "hidden" },
  tableHeadRow: { flexDirection: "row", backgroundColor: PDF_COLORS.ink, paddingVertical: 6, paddingHorizontal: 10, gap: 10 },
  tableHeadCell: { fontSize: 8, letterSpacing: 0.5, color: "#ffffff", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10, gap: 10, borderTopWidth: 1, borderTopColor: PDF_COLORS.line },
  tableCell: { fontSize: 9.5, color: PDF_COLORS.ink },
  tableCellMuted: { fontSize: 8.5, color: PDF_COLORS.muted },
  tag: { fontSize: 7, fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.line,
    paddingTop: 8,
  },
  footerText: { fontSize: 7.5, color: PDF_COLORS.muted2 },
});

export function PdfFooter({ scopeLabel, docLabel, generatedOn }: { scopeLabel: string; docLabel: string; generatedOn: string }) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>
        greydigi pte ltd · Confidential · {scopeLabel}, {docLabel} · {generatedOn}
      </Text>
      <Text style={pdfStyles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function PdfBrandHeader({ logoSrc }: { logoSrc: string }) {
  return (
    <View style={pdfStyles.headerRow}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image has no alt prop */}
      <Image src={logoSrc} style={pdfStyles.logo} />
      <Text style={pdfStyles.wordmark}>greydigi</Text>
    </View>
  );
}

export interface PdfColumn<T> {
  header: string;
  width: string;
  muted?: boolean;
  render: (row: T) => ReactNode;
}

/** A plain columns+rows table in the same visual style as every table in
 * CheckpointPdf.tsx -- the one piece nearly every export needs (a list of
 * projects, incidents, people, audit entries...), so it's built once here
 * instead of once per export. */
export function PdfTable<T>({ columns, rows, keyOf }: { columns: PdfColumn<T>[]; rows: T[]; keyOf: (row: T, i: number) => string }) {
  return (
    <View style={pdfStyles.table}>
      <View style={pdfStyles.tableHeadRow}>
        {columns.map((c, i) => (
          <Text key={i} style={[pdfStyles.tableHeadCell, columnFlexStyle(c.width)]}>
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={keyOf(row, i)} style={pdfStyles.tableRow}>
          {columns.map((c, j) => (
            <Text key={j} style={[c.muted ? pdfStyles.tableCellMuted : pdfStyles.tableCell, columnFlexStyle(c.width)]}>
              {c.render(row)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Columns used to be given a literal `width: "12%"` with zero gap between
 * cells (tableRow/tableHeadRow had no `gap`) -- fine as long as a cell's
 * text stayed shorter than its box, but the moment a REF column's text
 * ("Phase1-T12") ran right up against its declared width, the next
 * column's text started with no visual gap at all, reading as one fused
 * word ("Phase1-T12Stabilisation..."). Adding `gap` on the row alone
 * isn't safe when column widths already sum to 100% -- gap adds EXTRA
 * space on top of that, pushing the row wider than the page. Reading each
 * width as a flexGrow weight (with flexBasis 0) instead of a literal
 * percentage fixes both at once: Yoga (react-pdf's flexbox engine)
 * subtracts the row's `gap` from the available width *before* dividing
 * the remainder by weight, so the columns and the gaps between them
 * always fit inside the row regardless of how many columns there are. */
function columnFlexStyle(width: string) {
  return { flexGrow: parseFloat(width) || 1, flexBasis: 0 as const };
}

export function PdfEmptyNote({ children }: { children: ReactNode }) {
  return <Text style={pdfStyles.tableCellMuted}>{children}</Text>;
}
