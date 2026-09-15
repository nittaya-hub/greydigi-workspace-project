import Link from "next/link";
import { Card, CardHeader, StatTile, Eyebrow } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { getWorkspaceOverview } from "@/lib/data/workspace";
import { getManifestSummary } from "@/lib/data/manifest";
import { DecisionQueueCard } from "@/components/dashboard/DecisionQueueCard";

/** Everything on the master overview page (`src/app/(app)/page.tsx`)
 * below the title block -- extracted so the Puppeteer-printed twin
 * (`src/app/print/overview/page.tsx`) renders the identical markup, the
 * same way ProjectOverviewMain.tsx does for the per-project page. Fetches
 * its own data rather than taking it as a prop so both callers stay a
 * one-line `<WorkspaceOverviewMain ... />`. */
export async function WorkspaceOverviewMain({ workspaceId, selectedClientId }: { workspaceId: string; selectedClientId: string | null }) {
  const [overview, manifest] = await Promise.all([getWorkspaceOverview(workspaceId, selectedClientId), getManifestSummary(workspaceId)]);
  const { byHealth } = overview.portfolioHealth;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile
          label="DECISIONS"
          value={overview.decisionQueue.length}
          note={overview.decisionQueue[0] ? `Oldest ${overview.decisionQueue[0].age.toLowerCase()}` : "None waiting"}
          accent={overview.decisionQueue.length > 0}
        />
        <StatTile
          label="NEXT GATE"
          value={overview.nextGate?.daysUntil !== null && overview.nextGate?.daysUntil !== undefined ? `${overview.nextGate.daysUntil}d` : "—"}
          note={overview.nextGate ? `${overview.nextGate.ref} · ${overview.nextGate.code}` : "None held"}
          href="/missions/gates"
        />
        <StatTile label="CLIENT ACTIONS" value={overview.clientActions.count} note={overview.clientActions.detail} href="/missions/projects" />
        <StatTile label="CAPACITY" value="—" note="Not tracked yet" />
        <StatTile label="VALUE AT RISK" value="—" note="Not tracked yet" />
        <StatTile
          label="REUSE"
          value={manifest.totalReuseCount}
          note={`${manifest.assetCount} asset${manifest.assetCount === 1 ? "" : "s"} registered`}
          href="/manifest/assets"
        />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <Card>
          <DecisionQueueCard items={overview.decisionQueue} />
        </Card>

        <div className="flex flex-col gap-4">
          {/* White card, matching the two cards below it exactly (the
              Decision Pack's own entry-screen mock, page 4, shows all
              three right-column cards in the same plain white style —
              not the app's dark "hero" treatment used elsewhere). */}
          <Card className="p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-display font-extrabold text-[13px]">Portfolio health</span>
              <span className="font-mono text-[9px] text-muted">{overview.portfolioHealth.total} MISSIONS</span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-extrabold text-[26px] text-ink tracking-[-0.03em]">
                {byHealth.on_plan} / {overview.portfolioHealth.total}
              </span>
              <span className="text-[11px] text-muted">on plan</span>
            </div>
            <div className="flex gap-1">
              {(["on_plan", "watch", "blocked"] as const).flatMap((key) =>
                Array.from({ length: byHealth[key] }, (_, i) => (
                  <span
                    key={`${key}-${i}`}
                    className={`flex-1 h-1.5 rounded-[3px] ${
                      key === "on_plan" ? "bg-ink" : key === "watch" ? "bg-[#E8A94D]" : "bg-coral"
                    }`}
                  />
                ))
              )}
              {overview.portfolioHealth.total === 0 ? <span className="flex-1 h-1.5 rounded-[3px] bg-line" /> : null}
            </div>
            <div className="flex justify-between font-mono text-[9px] text-muted">
              <span>{byHealth.on_plan} ON PLAN</span>
              <span>{byHealth.blocked} BLOCKED</span>
              <span>{byHealth.watch} WATCH</span>
            </div>
            <span className="text-[11.5px] text-muted leading-[1.55]">
              Gate slip against the locked baseline, not percent complete.
            </span>
          </Card>

          {/* Capacity tracking (people, reserve, run-vs-mission split) has
              no data model yet -- it's Hypercare's "protected capacity"
              rule, Wave 4 of the Decision Pack build order. Honest empty
              state rather than a fabricated bar. */}
          <Card className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-display font-extrabold text-[13px]">Capacity, this week</span>
              <span className="font-mono text-[9px] text-muted">NOT TRACKED YET</span>
            </div>
            <span className="text-[11.5px] text-muted leading-[1.55]">
              Ships with the Hypercare cockpit rebuild — one queue per person, a protected reserve for run work, and
              run work made visible against mission gate dates.
            </span>
          </Card>

          {/* Real numbers now (0062_manifest.sql) -- calibration is
              written automatically by a gate-close trigger, assets/
              decisions are curated. See /manifest for the breakdown. */}
          <Card className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-display font-extrabold text-[13px]">Manifest</span>
              <Eyebrow>WRITE-BACK</Eyebrow>
            </div>
            <span className="text-[11.5px] text-muted leading-[1.55]">
              {manifest.assetCount} asset{manifest.assetCount === 1 ? "" : "s"}, {manifest.totalReuseCount} total
              reuse. {manifest.calibrationThisWeek} gate{manifest.calibrationThisWeek === 1 ? "" : "s"} closed this
              week with its calibration recorded. {manifest.decisionCount} decision{manifest.decisionCount === 1 ? "" : "s"} logged.
            </span>
            <Link href="/manifest" className="text-[11.5px] text-coral font-semibold">
              Open Manifest →
            </Link>
          </Card>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Missions" note="COCKPIT 01" />
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            <Row label="Missions in flight" value={overview.spaceSummaries.missions.projects} href="/missions/projects" />
            <Row label="Next held gate" value={overview.spaceSummaries.missions.nextGate ?? "None"} href="/missions/gates" />
          </div>
          <div className="px-4 pb-3.5">
            <LinkButton href="/missions" variant="secondary" className="w-full">
              Open Missions
            </LinkButton>
          </div>
        </Card>
        <Card>
          <CardHeader title="Hypercare" note="COCKPIT 02" />
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            <Row label="Services live" value={overview.spaceSummaries.hypercare.servicesLive} href="/hypercare/services" />
            <Row label="Active incidents" value={overview.spaceSummaries.hypercare.activeIncidents} accent href="/hypercare/incidents" />
            <Row label="Request backlog" value={overview.spaceSummaries.hypercare.requestBacklog} href="/hypercare/requests" />
          </div>
          <div className="px-4 pb-3.5">
            <LinkButton href="/hypercare" variant="secondary" className="w-full">
              Open Hypercare
            </LinkButton>
          </div>
        </Card>
        <Card>
          <CardHeader title="Hangar" note="COCKPIT 03" />
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            <Row label="Products" value={overview.spaceSummaries.hangar.products} href="/hangar/products" />
            <Row label="Features in build" value={overview.spaceSummaries.hangar.featuresInBuild} href="/hangar/features" />
            <Row label="Missions waiting on Hangar" value={overview.spaceSummaries.hangar.deliveryWaiting} accent href="/hangar/roadmap" />
          </div>
          <div className="px-4 pb-3.5">
            <LinkButton href="/hangar" variant="secondary" className="w-full">
              Open Hangar
            </LinkButton>
          </div>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value, accent = false, href }: { label: string; value: string | number; accent?: boolean; href?: string }) {
  const content = (
    <>
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${accent ? "text-coral" : "text-ink"}`}>{value}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="flex justify-between text-[12px] hover:underline">
        {content}
      </Link>
    );
  }
  return <div className="flex justify-between text-[12px]">{content}</div>;
}
