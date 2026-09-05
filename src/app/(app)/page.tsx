import Link from "next/link";
import { PageHeading, Card, CardHeader, StatTile, HeroPanel, Eyebrow } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button, LinkButton } from "@/components/ui/Button";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId, getWorkspaceOverview } from "@/lib/data/workspace";

const SPACE_PILL: Record<string, { bg: string; fg: string }> = {
  delivery: { bg: "bg-coral-tint", fg: "text-coral-strong" },
  hypercare: { bg: "bg-block-bg", fg: "text-block-fg" },
  product: { bg: "bg-neutral-bg", fg: "text-ink" },
  cross: { bg: "bg-idle-bg", fg: "text-muted" },
};

const QUEUE_COLS = "84px 1fr 130px 90px";

export default async function WorkspaceOverviewPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
        <PageHeading
          title="Workspace"
          description="Three spaces read the same client, person and project records. Every number names its source and its formula."
        />
        <Card className="p-5">
          <p className="text-[12.5px] text-muted max-w-[60ch]">
            Not signed in, or this workspace has no data yet. Sign in as a workspace member to see the real
            portfolio here, or apply <code className="font-mono text-[11px]">supabase/seed.sql</code> to your
            project for a populated demo (see <code className="font-mono text-[11px]">supabase/README.md</code>).
          </p>
        </Card>
      </div>
    );
  }

  const overview = await getWorkspaceOverview(workspaceId);
  const { byHealth } = overview.portfolioHealth;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading
          title="Workspace"
          description="Three spaces read the same client, person and project records. Every number names its source and its formula."
        />
        <div className="flex gap-1.5 flex-none">
          <Button variant="secondary">Workspace settings</Button>
          <Button variant="primary">Create project</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile label="ACTIVE PROJECTS" value={overview.activeProjects} note={`Across ${overview.clientCount} clients`} />
        <StatTile
          label="BLOCKED GATES"
          value={overview.blockedGates.count}
          note={overview.blockedGates.detail || "None"}
          accent={overview.blockedGates.count > 0}
        />
        <StatTile label="CLIENT ACTIONS" value={overview.clientActions.count} note={overview.clientActions.detail} />
        <StatTile
          label="LIVE INCIDENTS"
          value={overview.liveIncidents.count}
          note={overview.liveIncidents.count > 0 ? "Needs attention" : "None"}
          accent={overview.liveIncidents.count > 0}
        />
        <StatTile
          label="RELEASE DEPENDENCIES"
          value={overview.releaseDependencies.count}
          note="Delivery projects waiting on product"
        />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <Card>
          <CardHeader title="Needs a decision" note="ONE QUEUE, ALL THREE SPACES" />
          {overview.decisionQueue.length === 0 ? (
            <div className="py-10 px-4 text-center text-[12.5px] text-muted">Nothing waiting on a decision.</div>
          ) : (
            <>
              <TableHead cols={QUEUE_COLS}>
                <span>SPACE</span>
                <span>WHAT IS WAITING</span>
                <span>ON</span>
                <span>AGE</span>
              </TableHead>
              {overview.decisionQueue.map((item, i) => {
                const tone = SPACE_PILL[item.space];
                return (
                  <TableRow
                    cols={QUEUE_COLS}
                    key={i}
                    last={i === overview.decisionQueue.length - 1}
                  >
                    <Pill className={`${tone.bg} ${tone.fg} justify-self-start`}>{item.space.toUpperCase()}</Pill>
                    <CellStack primary={item.what} secondary={item.detail} />
                    <span className="text-muted truncate">{item.on}</span>
                    <span
                      className={`font-mono text-[10px] ${
                        item.ageTone === "block" ? "text-block-fg" : item.ageTone === "warn" ? "text-warn-fg" : "text-muted"
                      }`}
                    >
                      {item.age}
                    </span>
                  </TableRow>
                );
              })}
            </>
          )}
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
                      key === "on_plan" ? "bg-[#7A828F]" : key === "watch" ? "bg-warn-fg" : "bg-coral"
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
              Projects hold a versioned copy of the flight plan they cloned, so a template edit never moves work in
              flight.
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
            <Row label="Projects in flight" value={overview.spaceSummaries.delivery.projects} />
            <Row
              label="Next held gate"
              value={overview.spaceSummaries.delivery.nextGate ?? "None"}
            />
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
            <Row label="Products" value={overview.spaceSummaries.product.products} />
            <Row label="Features in build" value={overview.spaceSummaries.product.featuresInBuild} />
            <Row label="Delivery waiting on product" value={overview.spaceSummaries.product.deliveryWaiting} accent />
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
            <Row label="Services live" value={overview.spaceSummaries.hypercare.servicesLive} />
            <Row label="Active incidents" value={overview.spaceSummaries.hypercare.activeIncidents} accent />
            <Row label="Request backlog" value={overview.spaceSummaries.hypercare.requestBacklog} />
          </div>
          <div className="px-4 pb-3.5">
            <LinkButton href="/hypercare" variant="secondary" className="w-full">
              Open Hypercare
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${accent ? "text-coral" : "text-ink"}`}>{value}</span>
    </div>
  );
}
