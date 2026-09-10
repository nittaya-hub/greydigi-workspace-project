import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles, PdfBrandHeader, PdfFooter, PdfTable, PdfEmptyNote, type PdfColumn } from "@/lib/pdf/shared";

/** One-page "title + table" export, for every list that today only has a
 * CSV button (projects, service health, a person's work items, product
 * features, the audit log). Covers the common case; a dashboard with
 * several distinct sections (stats, several tables) gets its own
 * document instead of being forced through this shape. */
export function SimpleListPdf<T>({
  docTitle,
  eyebrow,
  scopeLabel,
  generatedOn,
  logoSrc,
  accentColor,
  columns,
  rows,
  keyOf,
  emptyNote,
}: {
  docTitle: string;
  eyebrow: string;
  scopeLabel: string;
  generatedOn: string;
  logoSrc: string;
  accentColor: string;
  columns: PdfColumn<T>[];
  rows: T[];
  keyOf: (row: T, i: number) => string;
  emptyNote: string;
}) {
  return (
    <Document title={docTitle}>
      <Page size="A4" style={pdfStyles.page}>
        <PdfBrandHeader logoSrc={logoSrc} />
        <View style={[pdfStyles.rule, { backgroundColor: accentColor }]} />
        <Text style={pdfStyles.eyebrow}>{eyebrow}</Text>
        <Text style={pdfStyles.title}>{docTitle}</Text>
        {rows.length === 0 ? <PdfEmptyNote>{emptyNote}</PdfEmptyNote> : <PdfTable columns={columns} rows={rows} keyOf={keyOf} />}
        <PdfFooter scopeLabel={scopeLabel} docLabel={docTitle} generatedOn={generatedOn} />
      </Page>
    </Document>
  );
}
