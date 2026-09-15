import Link from "next/link";
import { PageHeading, Card, CardHeader, StatTile } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getManifestSummary } from "@/lib/data/manifest";

/** The company brain — assets, decisions, calibration, written back from
 * Missions, Hangar and Hypercare on every gate close (0062_manifest.sql
 * — the write-back trigger on project_gates covers calibration
 * automatically; assets and decisions are curated, per that migration's
 * own reasoning). */
export default async function ManifestOverviewPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const summary = workspaceId ? await getManifestSummary(workspaceId) : null;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading
        title="Manifest"
        description="The company brain. Assets, decisions and calibration, written back from the other three cockpits."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="ASSETS" value={summary?.assetCount ?? 0} note="Registered" href="/manifest/assets" />
        <StatTile label="REUSE" value={summary?.totalReuseCount ?? 0} note="Total times reused" href="/manifest/assets" />
        <StatTile label="DECISIONS" value={summary?.decisionCount ?? 0} note="Logged" href="/manifest/decisions" />
        <StatTile
          label="CALIBRATION"
          value={summary?.calibrationCount ?? 0}
          note={
            summary
              ? `${summary.calibrationThisWeek} this week${summary.avgSlipDays !== null ? `, avg ${summary.avgSlipDays > 0 ? "+" : ""}${summary.avgSlipDays}d slip` : ""}`
              : "Gates cleared"
          }
          href="/manifest/calibration"
        />
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <p className="text-[12.5px] text-muted leading-[1.6]">
          Assets and decisions are logged by hand — nothing in the schema can tell "this agent got reused" on its
          own. Calibration is the one automatic half: a database trigger writes a row the moment any gate clears,
          measuring its close date against its own target date. That's the literal "no gate closes without a
          write-back" — not a percentage, a real database constraint.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader title="Assets" note="MANUAL" />
            <p className="px-4 pb-2 pt-1 text-[11.5px] text-muted leading-[1.55]">
              Agents, connectors, prompts and document templates, registered with a reuse count.
            </p>
            <Link href="/manifest/assets" className="block px-4 pb-3.5 text-[11.5px] font-semibold text-coral">
              Open Assets →
            </Link>
          </Card>
          <Card>
            <CardHeader title="Decisions" note="MANUAL" />
            <p className="px-4 pb-2 pt-1 text-[11.5px] text-muted leading-[1.55]">
              Decisions, objections and how they resolved — the pattern library.
            </p>
            <Link href="/manifest/decisions" className="block px-4 pb-3.5 text-[11.5px] font-semibold text-coral">
              Open Decisions →
            </Link>
          </Card>
          <Card>
            <CardHeader title="Calibration" note="AUTOMATIC" />
            <p className="px-4 pb-2 pt-1 text-[11.5px] text-muted leading-[1.55]">
              Gate slip against its own target date — written the moment every gate clears, never by hand.
            </p>
            <Link href="/manifest/calibration" className="block px-4 pb-3.5 text-[11.5px] font-semibold text-coral">
              Open Calibration →
            </Link>
          </Card>
        </div>
      </Card>
    </div>
  );
}
