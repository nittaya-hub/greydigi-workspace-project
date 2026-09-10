import { PageHeading, Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { AdminOnlyNotice } from "@/components/ui/AdminOnlyNotice";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getWorkspaceBranding, readColorToken } from "@/lib/data/branding";
import { UploadBrandingButton } from "./UploadBrandingButton";

const SWATCHES: { label: string; path: string }[] = [
  { label: "Brand coral", path: "color.brand.coral" },
  { label: "Ink", path: "color.brand.ink" },
  { label: "Paper", path: "color.brand.paper" },
  { label: "Success", path: "color.functional.success" },
  { label: "Warning", path: "color.functional.warning" },
  { label: "Error", path: "color.functional.error" },
];

/** Split out from the old combined "Portal and branding" page — this
 * half is the actual brand system (logo, colors, PDF/Excel export
 * theme), sourced from an uploaded design-tokens package rather than
 * hand-entered fields. See actions.ts for why this reads a .skill file
 * as plain zip data rather than invoking it as a Claude skill. Client
 * portal settings moved to "Client Management"
 * (src/app/(app)/settings/portal/page.tsx). */
export default async function BrandingSettingsPage() {
  const viewer = await getCurrentPerson();
  if (viewer?.workspace_role !== "workspace_admin") return <AdminOnlyNotice title="Branding" />;

  const branding = await getWorkspaceBranding(viewer.workspace_id);
  const swatches = SWATCHES.map((s) => ({ ...s, value: readColorToken(branding.tokens, s.path) })).filter((s) => s.value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading
          title="Branding"
          description="The logo, colors, and PDF template every export in this system uses — Delivery reports, client-facing PDFs, Excel exports. Upload a new theme package whenever the brand changes; every export picks it up immediately, no code change needed."
        />
        <UploadBrandingButton />
      </div>

      {!branding.sourceFilename ? (
        <Card>
          <EmptyState
            title="No theme uploaded yet."
            description="Exports use the app's built-in default look until a theme package is uploaded."
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Current theme" note={branding.updatedAt ? new Date(branding.updatedAt).toLocaleDateString() : undefined} />
            <div className="px-4 py-3.5 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {branding.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data: URL, not an optimizable remote asset
                  <img src={branding.logoDataUrl} alt="Workspace logo" className="h-12 w-auto max-w-[160px] object-contain" />
                ) : (
                  <span className="text-[11.5px] text-muted">No logo found in this package.</span>
                )}
                <span className="font-mono text-[9.5px] text-muted">
                  Source: {branding.sourceFilename}
                  {branding.logoFilename ? ` · Logo: ${branding.logoFilename}` : ""}
                </span>
              </div>

              {swatches.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {swatches.map((s) => (
                    <div key={s.path} className="flex flex-col items-center gap-1">
                      <span className="w-9 h-9 rounded-[8px] border border-line" style={{ backgroundColor: s.value! }} />
                      <span className="font-mono text-[8.5px] text-muted">{s.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[11.5px] text-muted">No color tokens found in this package.</span>
              )}

              <span className="text-[11.5px] text-muted">
                {branding.htmlTemplate ? "Includes an HTML export template." : "No HTML export template bundled — exports fall back to the built-in layout with these colors and logo applied."}
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
