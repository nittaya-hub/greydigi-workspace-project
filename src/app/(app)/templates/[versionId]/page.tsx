import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Tabs, Tab } from "@/components/ui/Tabs";
import { getTemplateVersion } from "@/lib/data/templates";
import { DuplicateButton } from "./DuplicateButton";
import { listGateConditionsWithIds } from "./data";
import { GateConditionSignatureToggle } from "./GateConditionSignatureToggle";
import { PhaseDurationEditor } from "./PhaseDurationEditor";

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ versionId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { versionId } = await params;
  const { tab } = await searchParams;
  const template = await getTemplateVersion(versionId);
  if (!template) notFound();

  const activeTab = tab === "conditions" ? "conditions" : "phases";
  const base = `/templates/${template.id}`;

  const gateConditionRows = activeTab === "conditions" ? await listGateConditionsWithIds(template.id) : [];
  const groupedConditions: { gateCode: string; gateName: string; conditions: typeof gateConditionRows }[] = [];
  for (const row of gateConditionRows) {
    let group = groupedConditions.find((g) => g.gateCode === row.gateCode);
    if (!group) {
      group = { gateCode: row.gateCode, gateName: row.gateName, conditions: [] };
      groupedConditions.push(group);
    }
    group.conditions.push(row);
  }

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[900px]">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
          <span className="font-mono text-[9.5px] text-muted">
            {template.version.toUpperCase()} · {template.isLocked ? "LOCKED" : "DRAFT"} · USED BY {template.usedByCount} PROJECTS
          </span>
          <h1 className="m-0 font-display font-extrabold text-[20px] text-ink">{template.name}</h1>
        </div>
        <DuplicateButton versionId={template.id} />
      </div>

      <Tabs>
        <Tab href={base} active={activeTab === "phases"}>
          Phases
        </Tab>
        <Tab href={`${base}?tab=conditions`} active={activeTab === "conditions"}>
          Gate conditions
        </Tab>
      </Tabs>

      {activeTab === "phases" ? (
        <Card>
          <div className="grid grid-cols-[48px_1fr_66px_66px_190px] gap-2.5 px-4 py-2.5 bg-[#FCFCFA] border-b border-line-soft font-mono text-[9px] tracking-[.08em] text-muted">
            <span>NO</span>
            <span>PHASE</span>
            <span>TASKS</span>
            <span>GATE</span>
            <span>DURATION LABEL</span>
          </div>
          {template.phases.map((p, i) => (
            <div
              key={p.index}
              className={`grid grid-cols-[48px_1fr_66px_66px_190px] gap-2.5 items-center px-4 py-[11px] text-[12px] ${i < template.phases.length - 1 ? "border-b border-line-soft" : ""}`}
            >
              <span className="font-mono text-[9.5px] text-muted">{p.code}</span>
              <span className="text-[12.5px] font-semibold text-ink">{p.name}</span>
              <span className="font-mono text-[9.5px] text-muted">{p.taskCount}</span>
              {p.gateCode ? <Pill tone="in_progress" className="justify-self-start">{p.gateCode}</Pill> : <span className="text-muted">—</span>}
              <PhaseDurationEditor
                phaseId={p.id}
                versionId={template.id}
                disabled={template.isLocked}
                initialDurationLabel={p.durationLabel}
                initialShowDurationLabel={p.showDurationLabel}
              />
            </div>
          ))}
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedConditions.map((g) => (
            <Card key={g.gateCode}>
              <CardHeader title={`${g.gateCode} ${g.gateName}`} note={`${g.conditions.length} CONDITIONS`} />
              <div className="flex flex-col">
                {g.conditions.map((c, i) => (
                  <div key={c.id} className={`grid grid-cols-[1fr_120px] gap-2.5 items-center px-4 py-[11px] text-[12px] ${i < g.conditions.length - 1 ? "border-b border-line-soft" : ""}`}>
                    <span className="text-ink">{c.description}</span>
                    <GateConditionSignatureToggle
                      conditionId={c.id}
                      versionId={template.id}
                      disabled={template.isLocked}
                      initialRequiresSignature={c.requiresSignature}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
