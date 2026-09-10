import Link from "next/link";
import { Card, CardHeader, StatTile, HeroPanel, Eyebrow } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { getWorkspaceOverview } from "@/lib/data/workspace";
import { DecisionQueueCard } from "@/components/dashboard/DecisionQueueCard";

/** Everything on the master overview page (`src/app/(app)/page.tsx`)
 * below the title block -- extracted so the Puppeteer-printed twin
 * (`src/app/print/overview/page.tsx`) renders the identical markup, the
 * same way ProjectOverviewMain.tsx does for the per-project page. Fetches
 * its own data rather than taking it as a prop so both callers stay a
 * one-line `<WorkspaceOverviewMain ... />`. */
export async function WorkspaceOverviewMain({ workspaceId, selectedClientId }: { workspaceId: string; selectedClientId: string | null }) {
  const overview = await getWorkspaceOverview(workspaceId, selectedClientId);
  const { byHealth } = overview.portfolioHealth;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile label="ACTIVE PROJECTS" value={overview.activeProjects} note={`Across ${overview.clientCount} clients`} href="/delivery/projects" />
        <StatTile
          label="BLOCKED GATES"
          value={overview.blockedGates.count}
          note={overview.blockedGates.detail || "None"}
          accent={overview.blockedGates.count > 0}
          href="/delivery/gates"
        />
        <StatTile label="CLIENT ACTIONS" value={overview.clientActions.count} note={overview.clientActions.detail} href="/delivery/projects" />
        <StatTile
          label="LIVE INCIDENTS"
          value={overview.liveIncidents.count}
          note={overview.liveIncidents.count > 0 ? "Needs attention" : "None"}
          accent={overview.liveIncidents.count > 0}
          href="/hypercare/incidents"
        />
        <StatTile label="RELEASE DEPENDENCIES" value={overview.releaseDependencies.count} note="Delivery projects waiting on product" href="/product/roadmap" />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <Card>
          <DecisionQueueCard items={overview.decisionQueue} />
        </Card>

        <div className="flex flex-col gap-4">
          <HeroPanel>
            <Eyebrow className="text-muted-2">PORTFOLIO HEALTH</Eyebrow>
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-extrabold text-[30px]">
                {byHealth.on_plan} / {overview.portfolioHealth.total}
              </span>
              <span className="text-[12px] text-muted-2">on plan</span>
            </div>
            <div className="flex gap-1">
              {(["on_plan", "watch", "blocked"] as const).flatMap((key) =>
                Array.from({ length: byHealth[key] }, (_, i) => (
                  <span
                    key={`${key}-${i}`}
                    className={`flex-1 h-1.5 rounded-[3px] ${
                      key === "on_plan" ? "bg-[#EDEEF1]" : key === "watch" ? "bg-[#E8A94D]" : "bg-coral"
                    }`}
                  />
                ))
              )}
              {overview.portfolioHealth.total === 0 ? <span className="flex-1 h-1.5 rounded-[3px] bg-white/15" /> : null}
            </div>
            <div className="flex justify-between font-mono text-[9px] text-muted-2">
              <span>{byHealth.on_plan} ON PLAN</span>
              <span>{byHealth.blocked} BLOCKED</span>
              <span>{byHealth.watch} WATCH</span>
            </div>
            <span className="text-[11.5px] text-muted-2 leading-[1.5]">
              Health reads from gate slip, overdue critical work and unresolved client action. Never task counts.
            </span>
          </HeroPanel>

          <Card className="p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-display font-extrabold text-[14px]">Methodology core</span>
              <Pill tone="coral_outline">LOCKED</Pill>
            </div>
            <span className="text-[11.5px] text-muted leading-[1.55]">
              Projects hold a versioned copy of the flight plan they cloned, so a template edit never moves work in flight.
            </span>
            <Link href="/templates" className="text-[11.5px] text-coral font-semibold">
              View templates →
            </Link>
          </Card>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Delivery" note="SPACE 01" />
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            <Row label="Projects in flight" value={overview.spaceSummaries.delivery.projects} href="/delivery/projects" />
            <Row label="Next held gate" value={overview.spaceSummaries.delivery.nextGate ?? "None"} href="/delivery/gates" />
          </div>
          <div className="px-4 pb-3.5">
            <LinkButton href="/delivery" variant="secondary" className="w-full">
              Open Delivery
            </LinkButton>
          </div>
        </Card>
        <Card>
          <CardHeader title="Product" note="SPACE 02" />
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            <Row label="Products" value={overview.spaceSummaries.product.products} href="/product/products" />
            <Row label="Features in build" value={overview.spaceSummaries.product.featuresInBuild} href="/product/features" />
            <Row label="Delivery waiting on product" value={overview.spaceSummaries.product.deliveryWaiting} accent href="/product/roadmap" />
          </div>
          <div className="px-4 pb-3.5">
            <LinkButton href="/product" variant="secondary" className="w-full">
              Open Product
            </LinkButton>
          </div>
        </Card>
        <Card>
          <CardHeader title="Hypercare" note="SPACE 03" />
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
