import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { Pill } from "@/components/ui/Pill";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listAssets } from "@/lib/data/manifest";
import { createClient } from "@/lib/supabase/server";
import { NewAssetButton } from "./NewAssetButton";
import { LogUsageButton } from "./LogUsageButton";

const COLS = "1fr 120px 90px 1fr";

const KIND_LABEL: Record<string, string> = {
  agent: "Agent",
  connector: "Connector",
  prompt: "Prompt",
  document_template: "Document template",
};

export default async function ManifestAssetsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const assets = workspaceId ? await listAssets(workspaceId) : [];

  let projects: { id: string; ref: string; name: string }[] = [];
  if (workspaceId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select("id, ref, name")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .order("ref");
    projects = data ?? [];
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <PageHeading
          size="md"
          title="Assets"
          description="Agents, connectors, prompts and document templates, registered with a reuse count. A standard deployment should be mostly assembly by mission ten."
        />
        <NewAssetButton />
      </div>

      <Card>
        {assets.length === 0 ? (
          <EmptyState
            title="No assets registered yet."
            description="Register the first agent, connector, prompt or document template worth reusing across missions."
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>ASSET</span>
              <span>KIND</span>
              <span>REUSE</span>
              <span></span>
            </TableHead>
            {assets.map((a, i) => (
              <TableRow cols={COLS} key={a.id} last={i === assets.length - 1}>
                <CellStack primary={a.name} secondary={a.description ?? undefined} />
                <Pill tone="idle">{KIND_LABEL[a.kind] ?? a.kind}</Pill>
                <span className={`font-mono text-[11px] font-semibold ${a.reuseCount > 0 ? "text-coral" : "text-muted"}`}>
                  {a.reuseCount}×
                </span>
                <div className="justify-self-end">
                  <LogUsageButton assetId={a.id} assetName={a.name} projects={projects} />
                </div>
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
