import { notFound } from "next/navigation";
import { Card, StatTile, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Tabs, Tab } from "@/components/ui/Tabs";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { getProjectByRef, getProjectDocuments } from "@/lib/data/project";

const COND_COLS = "52px 1fr 92px";
const DOC_COLS = "1fr 72px 110px";

export default async function FlightPlanCheckPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { ref } = await params;
  const { tab } = await searchParams;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const base = `/delivery/projects/${project.ref.toLowerCase()}/flight-plan-check`;
  const activeTab = tab === "documents" ? "documents" : "data";

  const supabase = await createClient();
  const gateIds = project.gates.map((g) => g.id);
  const { data: conditions } = gateIds.length
    ? await supabase
        .from("project_gate_conditions")
        .select("id, description, status, owner, project_gate_id")
        .in("project_gate_id", gateIds)
    : { data: [] as { id: string; description: string; status: string; owner: string; project_gate_id: string }[] };

  const gateByConditionGateId = new Map(project.gates.map((g) => [g.id, g]));
  const metCount = (conditions ?? []).filter((c) => c.status !== "open").length;
  const blockingNow = (conditions ?? []).filter((c) => c.status === "open");

  const documents = await getProjectDocuments(project.id);

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-[12.5px] text-muted max-w-[70ch]">
        Copied from the locked methodology when this project started. A template edit after that point does not
        change these conditions.
      </p>

      <Tabs>
        <Tab href={base} active={activeTab === "data"}>
          Data check
        </Tab>
        <Tab href={`${base}?tab=documents`} active={activeTab === "documents"}>
          Document check
        </Tab>
      </Tabs>

      {activeTab === "data" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatTile label="CONDITIONS MET" value={`${metCount} / ${conditions?.length ?? 0}`} note="Across all gates" />
            <StatTile
              label="BLOCKING NOW"
              value={blockingNow.length}
              note={blockingNow.every((c) => c.owner === "client") && blockingNow.length > 0 ? "All need the client" : undefined}
              accent={blockingNow.length > 0}
            />
          </div>
          <Card>
            {(conditions ?? []).length === 0 ? (
              <EmptyState title="No conditions yet." description="Conditions appear once the project clones a flight plan." />
            ) : (
              <>
                <TableHead cols={COND_COLS}>
                  <span>GATE</span>
                  <span>CONDITION</span>
                  <span>RESULT</span>
                </TableHead>
                {(conditions ?? []).map((c, i) => {
                  const gate = gateByConditionGateId.get(c.project_gate_id);
                  const result = c.status === "met" ? "PASS" : c.status === "waived" ? "OVERRIDDEN" : "FAIL";
                  return (
                    <TableRow cols={COND_COLS} key={c.id} last={i === (conditions?.length ?? 0) - 1}>
                      <span className="font-mono text-[9.5px] text-muted">{gate?.code ?? "—"}</span>
                      <CellStack primary={c.description} secondary={c.status === "open" ? `NEEDS THE ${c.owner.toUpperCase()}` : undefined} />
                      <Pill
                        tone={result === "PASS" ? "done" : result === "OVERRIDDEN" ? "in_progress" : "blocked"}
                        className="justify-self-start"
                      >
                        {result}
                      </Pill>
                    </TableRow>
                  );
                })}
              </>
            )}
          </Card>
          <Card className="p-4 flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[.09em] text-muted">OVERRIDE POLICY</span>
            <span className="text-[11.5px] text-muted leading-[1.55]">
              A failing condition can be overridden by a workspace admin with a written reason. The override is
              stamped on the gate, shown on the project overview, and never hidden from the client update.
            </span>
          </Card>
        </>
      ) : (
        <>
          <Card>
            {documents.length === 0 ? (
              <EmptyState
                title="No artefacts required yet."
                description="Requirements appear when the project reaches the phase that owns them."
              />
            ) : (
              <>
                <TableHead cols={DOC_COLS}>
                  <span>ARTEFACT</span>
                  <span>VER</span>
                  <span>SIGNATURE</span>
                </TableHead>
                {documents.map((d, i) => {
                  const sig = !d.requiresSignature ? "NOT REQUIRED" : d.signedAt ? "SIGNED" : "MISSING";
                  return (
                    <TableRow cols={DOC_COLS} key={d.id} last={i === documents.length - 1}>
                      <CellStack primary={d.name} secondary={d.signedAt ? `SIGNED ${d.signedAt}` : d.kind.toUpperCase()} />
                      <span className="font-mono text-[9.5px] text-muted">{d.version}</span>
                      <Pill tone={sig === "SIGNED" ? "done" : sig === "MISSING" ? "blocked" : "in_progress"} className="justify-self-start">
                        {sig}
                      </Pill>
                    </TableRow>
                  );
                })}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
