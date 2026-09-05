import { PageHeading, Card, CardHeader } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { saveGeneralSettings } from "./actions";

export default async function SettingsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  let workspaceName = "";
  let businessHours = "";
  let spaceCounts = { delivery: 0, product: 0, hypercare: 0 };

  if (workspaceId) {
    const supabase = await createClient();
    const [{ data: workspace }, { count: delivery }, { count: product }, { count: hypercare }] = await Promise.all([
      supabase.from("workspaces").select("name, business_hours").eq("id", workspaceId).maybeSingle(),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active"),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      supabase.from("services").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    ]);
    workspaceName = workspace?.name ?? "";
    businessHours = workspace?.business_hours ?? "";
    spaceCounts = { delivery: delivery ?? 0, product: product ?? 0, hypercare: hypercare ?? 0 };
  }

  async function save(formData: FormData) {
    "use server";
    if (!workspaceId) return;
    await saveGeneralSettings(workspaceId, {
      name: String(formData.get("name") ?? ""),
      businessHours: String(formData.get("businessHours") ?? ""),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Settings" />

      <form action={save} className="flex flex-col gap-3">
        <Card>
          <CardHeader title="General" />
          <div className="px-4 py-3.5 flex flex-col gap-3">
            <Field label="WORKSPACE NAME">
              <input
                name="name"
                defaultValue={workspaceName}
                disabled={!workspaceId}
                className="border border-line bg-white rounded-[9px] px-[11px] py-[9px] text-[12.5px] disabled:opacity-60"
              />
            </Field>
            <Field label="BUSINESS HOURS, USED BY SLA CLOCKS">
              <input
                name="businessHours"
                defaultValue={businessHours}
                disabled={!workspaceId}
                placeholder="Mon to Fri, 09:00 to 18:00"
                className="border border-line bg-white rounded-[9px] px-[11px] py-[9px] text-[12.5px] disabled:opacity-60"
              />
            </Field>
          </div>
        </Card>

        <div id="spaces" className="scroll-mt-4">
          <Card>
            <CardHeader title="Spaces" note="ENABLED PER WORKSPACE" />
            {(
              [
                { key: "delivery", label: "Delivery", note: `${spaceCounts.delivery} PROJECTS` },
                { key: "product", label: "Product", note: `${spaceCounts.product} PRODUCTS` },
                { key: "hypercare", label: "Hypercare", note: `${spaceCounts.hypercare} SERVICES` },
              ] as const
            ).map((s, i, arr) => (
              <div
                key={s.key}
                id={`spaces-${s.key}`}
                className={`scroll-mt-4 flex items-center gap-2.5 px-4 py-[11px] text-[12px] ${i < arr.length - 1 ? "border-b border-line-soft" : ""}`}
              >
                <span className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[12.5px] font-semibold text-ink">{s.label}</span>
                  <span className="font-mono text-[9.5px] text-muted">{s.note}</span>
                </span>
                <Pill tone="done">ON</Pill>
              </div>
            ))}
          </Card>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" type="submit" disabled={!workspaceId}>
            Save
          </Button>
          <Button variant="secondary" type="reset">
            Discard
          </Button>
          <a href="/auth/set-password" className="text-[11.5px] text-coral font-semibold ml-auto">
            Change your password →
          </a>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[9px] tracking-[.09em] text-muted">{label}</span>
      {children}
    </label>
  );
}
