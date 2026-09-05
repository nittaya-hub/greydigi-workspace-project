import { PageHeading, Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { savePortalSettings } from "../actions";

export default async function PortalSettingsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  let defaultShareExpiryDays = 30;
  let portalWelcomeMessage = "";

  if (workspaceId) {
    const supabase = await createClient();
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("default_share_expiry_days, portal_welcome_message")
      .eq("id", workspaceId)
      .maybeSingle();
    defaultShareExpiryDays = workspace?.default_share_expiry_days ?? 30;
    portalWelcomeMessage = workspace?.portal_welcome_message ?? "";
  }

  async function save(formData: FormData) {
    "use server";
    if (!workspaceId) return;
    await savePortalSettings(workspaceId, {
      defaultShareExpiryDays: Number(formData.get("defaultShareExpiryDays") ?? 30),
      portalWelcomeMessage: String(formData.get("portalWelcomeMessage") ?? ""),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Portal and branding"
        description="What client-portal viewers and public share links see. Reads a published projection, never internal records."
      />

      <form action={save} className="flex flex-col gap-3">
        <Card>
          <CardHeader title="Client portal" />
          <div className="px-4 py-3.5 flex flex-col gap-3">
            <Field label="WELCOME MESSAGE, SHOWN AT THE TOP OF THE CLIENT PORTAL">
              <textarea
                name="portalWelcomeMessage"
                defaultValue={portalWelcomeMessage}
                disabled={!workspaceId}
                rows={3}
                placeholder="Welcome to your delivery portal."
                className="border border-line bg-white rounded-[9px] px-[11px] py-[9px] text-[12.5px] disabled:opacity-60 resize-y"
              />
            </Field>
            <Field label="DEFAULT SHARE LINK EXPIRY, IN DAYS">
              <input
                name="defaultShareExpiryDays"
                type="number"
                min={1}
                defaultValue={defaultShareExpiryDays}
                disabled={!workspaceId}
                className="border border-line bg-white rounded-[9px] px-[11px] py-[9px] text-[12.5px] disabled:opacity-60 w-[140px]"
              />
            </Field>
          </div>
        </Card>

        <div>
          <Button variant="primary" type="submit" disabled={!workspaceId}>
            Save
          </Button>
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
