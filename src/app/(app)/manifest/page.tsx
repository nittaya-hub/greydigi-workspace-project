import Link from "next/link";
import { PageHeading, Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getManifestSummary } from "@/lib/data/manifest";
import { listOpenImprovementItemsForWorkspace } from "@/lib/data/hypercare-blueprint";

/** The company brain — assets, decisions, calibration, written back from
 * Missions, Hangar and Hypercare on every gate close. Missions writes
 * back automatically (project_gates trigger, 0062_manifest.sql); Hangar
 * writes back automatically too (product_gate_history, 0063); Hypercare
 * writes back through its improvement_items, read live rather than
 * copied (0064) — "nothing is retyped at any handoff," so this page
 * queries all three cockpits' own tables directly instead of a
 * manifest_* copy of each. */
export default async function ManifestOverviewPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const [summary, improvementItems] = await Promise.all([
    workspaceId ? getManifestSummary(workspaceId) : Promise.resolve(null),
    workspaceId ? listOpenImprovementItemsForWorkspace(workspaceId) : Promise.resolve([]),
  ]);

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

      <Card>
        <CardHeader title="Write-back across cockpits" note="ALL FOUR, ONE RULE" />
        <div className="px-4 py-3.5 flex flex-col gap-2.5">
          <Row
            cockpit="Missions"
            detail={`${summary?.calibrationCount ?? 0} gates cleared, ${summary?.calibrationThisWeek ?? 0} this week`}
            mechanism="Automatic trigger on project_gates"
            href="/manifest/calibration"
          />
          <Row
            cockpit="Hangar"
            detail={`${summary?.hangarGatesReached ?? 0} stage gates reached, ${summary?.hangarGatesThisWeek ?? 0} this week`}
            mechanism="Automatic trigger on products.stage_gate"
            href="/hangar/products"
          />
          <Row
            cockpit="Hypercare"
            detail={`${summary?.hypercareOpenImprovementItems ?? 0} open improvement items`}
            mechanism="Read live from improvement_items"
            href="/hypercare"
          />
        </div>
      </Card>

      {improvementItems.length > 0 ? (
        <Card>
          <CardHeader title="Open improvement items" note="FROM HYPERCARE, LIVE" />
          <div className="px-4 py-3.5 flex flex-col gap-2">
            {improvementItems.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2.5 py-1.5 border-b border-line-soft last:border-b-0">
                <span className="text-[12px] text-ink">{i.pattern}</span>
                <span className="flex items-center gap-2 flex-none">
                  <span className="font-mono text-[9.5px] text-muted">{i.serviceName}</span>
                  <Pill tone="watch">{i.frequency}×</Pill>
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ cockpit, detail, mechanism, href }: { cockpit: string; detail: string; mechanism: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 text-[12px] hover:text-coral">
      <span className="font-semibold text-ink flex-none w-[80px]">{cockpit}</span>
      <span className="flex-1 text-muted">{detail}</span>
      <span className="font-mono text-[9px] text-muted-2 flex-none">{mechanism}</span>
    </Link>
  );
}
