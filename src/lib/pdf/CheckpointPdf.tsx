import { Document, Page, View, Text } from "@react-pdf/renderer";
import type {
  ProjectContext,
  ProgressStatRow,
  DecisionRow,
  WeeklyCommitmentRow,
  BaselineMeasureRow,
} from "@/lib/data/project";
import { pdfStyles, PdfBrandHeader, PdfFooter, PdfTable, PdfEmptyNote } from "@/lib/pdf/shared";

// Server-only: rendered inside checkpoint/pdf/route.ts via renderToBuffer,
// never imported into a client bundle.
function ReviewTag({ reviewedAt, accentColor }: { reviewedAt: string | null; accentColor: string }) {
  return reviewedAt ? null : <Text style={[pdfStyles.tag, { color: accentColor }]}>NEEDS REVIEW</Text>;
}

export function CheckpointPdf({
  project,
  logoSrc,
  accentColor,
  generatedOn,
  stats,
  decisions,
  commitments,
  measures,
}: {
  project: ProjectContext;
  logoSrc: string;
  accentColor: string;
  generatedOn: string;
  stats: ProgressStatRow[];
  decisions: DecisionRow[];
  commitments: WeeklyCommitmentRow[];
  measures: BaselineMeasureRow[];
}) {
  const footer = <PdfFooter scopeLabel={project.clientName} docLabel={`${project.name} checkpoint`} generatedOn={generatedOn} />;

  return (
    <Document title={`${project.name} — checkpoint export`}>
      <Page size="A4" style={pdfStyles.page}>
        <PdfBrandHeader logoSrc={logoSrc} />
        <View style={[pdfStyles.rule, { backgroundColor: accentColor }]} />
        <Text style={pdfStyles.eyebrow}>
          {project.clientName} · {project.ref} · CHECKPOINT EXPORT
        </Text>
        <Text style={pdfStyles.title}>{project.name}</Text>
        {project.description ? <Text style={pdfStyles.description}>{project.description}</Text> : null}

        <View style={pdfStyles.infoPanel}>
          <View style={pdfStyles.infoRow}>
            <Text style={pdfStyles.infoLabel}>Generated</Text>
            <Text style={pdfStyles.infoValue}>{generatedOn}</Text>
          </View>
          <View style={pdfStyles.infoRow}>
            <Text style={pdfStyles.infoLabel}>Current phase</Text>
            <Text style={pdfStyles.infoValue}>
              {project.currentPhase ? `${project.currentPhase.code} ${project.currentPhase.name}` : "Not started"}
            </Text>
          </View>
          <View style={pdfStyles.infoRow}>
            <Text style={pdfStyles.infoLabel}>Held gate</Text>
            <Text style={pdfStyles.infoValue}>{project.heldGate ? `${project.heldGate.code} ${project.heldGate.name}` : "None"}</Text>
          </View>
          <View style={pdfStyles.infoRow}>
            <Text style={pdfStyles.infoLabel}>Progress</Text>
            <Text style={pdfStyles.infoValue}>{project.progressPct}%</Text>
          </View>
          <View style={pdfStyles.infoRow}>
            <Text style={pdfStyles.infoLabel}>Go live target</Text>
            <Text style={pdfStyles.infoValue}>{project.goLiveTarget ?? "—"}</Text>
          </View>
        </View>
        {footer}
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <PdfBrandHeader logoSrc={logoSrc} />
        <Text style={pdfStyles.eyebrow}>PROGRESS AGAINST MILESTONE</Text>
        <Text style={pdfStyles.sectionHeading}>Build-progress stats</Text>
        {stats.length === 0 ? (
          <PdfEmptyNote>Nothing entered yet — add stats on the Checkpoint data tab.</PdfEmptyNote>
        ) : (
          <View style={pdfStyles.statGrid}>
            {stats.map((s) => (
              <View key={s.id} style={pdfStyles.statCard}>
                <Text style={[pdfStyles.statValue, { color: accentColor }]}>{s.value}</Text>
                <Text style={pdfStyles.statLabel}>{s.label}</Text>
                {s.note ? <Text style={pdfStyles.statNote}>{s.note}</Text> : null}
                <ReviewTag reviewedAt={s.reviewedAt} accentColor={accentColor} />
              </View>
            ))}
          </View>
        )}

        <Text style={pdfStyles.sectionHeading}>Flight plan phases</Text>
        <PdfTable
          keyOf={(p) => p.id}
          rows={project.phases}
          columns={[
            { header: "CODE", width: "12%", render: (p) => p.code },
            { header: "PHASE", width: "58%", render: (p) => p.name },
            {
              header: "STATUS",
              width: "30%",
              muted: true,
              render: (p) => (p.completedAt ? `Done ${p.completedAt.slice(0, 10)}` : p.startedAt ? "In progress" : "Not started"),
            },
          ]}
        />

        <Text style={pdfStyles.sectionHeading}>Gates</Text>
        <PdfTable
          keyOf={(g) => g.id}
          rows={project.gates}
          columns={[
            { header: "CODE", width: "12%", render: (g) => g.code },
            { header: "GATE", width: "48%", render: (g) => g.name },
            { header: "STATUS", width: "20%", muted: true, render: (g) => g.status.replace("_", " ").toUpperCase() },
            { header: "TARGET", width: "20%", muted: true, render: (g) => g.targetDate ?? "—" },
          ]}
        />
        {footer}
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <PdfBrandHeader logoSrc={logoSrc} />
        <Text style={pdfStyles.eyebrow}>DECISIONS AND RISKS</Text>
        <Text style={pdfStyles.sectionHeading}>Decisions log</Text>
        {decisions.length === 0 ? (
          <PdfEmptyNote>Nothing logged yet — add decisions on the Checkpoint data tab.</PdfEmptyNote>
        ) : (
          decisions.map((d) => (
            <View key={d.id} style={pdfStyles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={[pdfStyles.tableCell, { fontWeight: 700 }]}>{d.title}</Text>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <ReviewTag reviewedAt={d.reviewedAt} accentColor={accentColor} />
                  <Text style={pdfStyles.tableCellMuted}>{d.status.toUpperCase()}</Text>
                </View>
              </View>
              {d.detail ? <Text style={[pdfStyles.tableCellMuted, { marginBottom: 3 }]}>{d.detail}</Text> : null}
              <Text style={pdfStyles.tableCellMuted}>
                {(d.owner ?? "—").toUpperCase()} · {d.dueLabel ?? "no date"}
              </Text>
            </View>
          ))
        )}
        {footer}
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <PdfBrandHeader logoSrc={logoSrc} />
        <Text style={pdfStyles.eyebrow}>NEXT TWO WEEKS</Text>
        <Text style={pdfStyles.sectionHeading}>This week / next week</Text>
        {commitments.length === 0 ? (
          <PdfEmptyNote>Nothing entered yet — add commitments on the Checkpoint data tab.</PdfEmptyNote>
        ) : (
          commitments.map((c) => (
            <View key={c.id} style={[pdfStyles.card, c.accent ? { borderColor: accentColor } : undefined]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={[pdfStyles.tableCell, { fontWeight: 700 }]}>{c.periodLabel}</Text>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <ReviewTag reviewedAt={c.reviewedAt} accentColor={accentColor} />
                  <Text style={pdfStyles.tableCellMuted}>{c.ownerLabel.toUpperCase()}</Text>
                </View>
              </View>
              {c.items.map((item, i) => (
                <Text key={i} style={[pdfStyles.tableCellMuted, { marginTop: 2 }]}>
                  · {item}
                </Text>
              ))}
            </View>
          ))
        )}
        {footer}
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <PdfBrandHeader logoSrc={logoSrc} />
        <Text style={pdfStyles.eyebrow}>MEASURES WE HOLD OURSELVES TO</Text>
        <Text style={pdfStyles.sectionHeading}>Baseline measures</Text>
        {measures.length === 0 ? (
          <PdfEmptyNote>Nothing entered yet — add measures on the Checkpoint data tab.</PdfEmptyNote>
        ) : (
          <PdfTable
            keyOf={(m) => m.id}
            rows={measures}
            columns={[
              { header: "MEASURE", width: "34%", render: (m) => m.measureName },
              { header: "TODAY", width: "22%", muted: true, render: (m) => m.todayValue },
              { header: "AFTER", width: "22%", muted: true, render: (m) => m.afterValue },
              { header: "BASELINED WHEN", width: "22%", muted: true, render: (m) => m.baselinedWhen ?? "—" },
            ]}
          />
        )}
        {footer}
      </Page>
    </Document>
  );
}
