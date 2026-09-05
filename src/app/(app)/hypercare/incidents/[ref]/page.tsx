import { notFound } from "next/navigation";
import { Card, CardHeader, HeroPanel, Eyebrow } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getIncidentByRef, formatDuration, minutesUntil } from "@/lib/data/hypercare";
import { PauseClockButton } from "./PauseClockButton";
import { ResolveButton } from "./ResolveButton";

const SEV_TONE: Record<string, "blocked" | "in_progress" | "idle"> = { sev1: "blocked", sev2: "in_progress", sev3: "idle" };

export default async function IncidentDetailPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const incident = await getIncidentByRef(ref);
  if (!incident) notFound();

  const breachMinutes = incident.breachAt ? minutesUntil(incident.breachAt) : null;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[820px]">
      <div className="flex flex-col gap-1.5">
        <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
        <span className="font-mono text-[9.5px] text-muted">
          {incident.ref} · {incident.serviceRef} {incident.serviceName} · {incident.clientName}
        </span>
        <h1 className="m-0 font-display font-extrabold text-[20px] text-ink">{incident.title}</h1>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <Pill tone={SEV_TONE[incident.severity] ?? "idle"}>{incident.severity.toUpperCase()}</Pill>
        <Pill tone={incident.status === "resolved" ? "done" : "idle"}>{incident.status.replace(/_/g, " ").toUpperCase()}</Pill>
      </div>

      {incident.status !== "resolved" && incident.breachAt ? (
        <HeroPanel>
          <Eyebrow className="text-muted-2">BREACH CLOCK</Eyebrow>
          <div className="flex items-baseline gap-2.5">
            <span className={`font-display font-extrabold text-[30px] ${breachMinutes != null && breachMinutes < 6 * 60 ? "text-coral" : ""}`}>
              {breachMinutes != null ? formatDuration(breachMinutes) : "—"}
            </span>
            <span className="text-[12px] text-muted-2">left</span>
          </div>
          <div className="flex gap-1">
            <span className="flex-[5] h-1.5 rounded-[3px] bg-[#7A828F]" />
            <span className="flex-1 h-1.5 rounded-[3px] bg-coral" />
          </div>
          <div className="flex gap-1.5 mt-1">
            <PauseClockButton incidentId={incident.id} incidentRef={incident.ref} />
            <ResolveButton incidentId={incident.id} incidentRef={incident.ref} />
          </div>
        </HeroPanel>
      ) : null}

      {incident.rootCause ? (
        <Card>
          <CardHeader title="Root cause" />
          <div className="px-4 py-3.5">
            <span className="text-[12px] text-muted leading-[1.55]">{incident.rootCause}</span>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Timeline" note="ACTOR AND TIME ON EVERY ROW" />
        <div className="px-4 py-3.5 flex flex-col gap-2.5 text-[12px]">
          <div className="flex gap-2.5">
            <span className="font-mono text-[9.5px] text-muted flex-none w-[90px]">{new Date(incident.openedAt).toLocaleString()}</span>
            <span className="flex-1">
              Opened. <span className="font-mono text-[9.5px] text-muted">SYSTEM</span>
            </span>
          </div>
          {incident.resolvedAt ? (
            <div className="flex gap-2.5">
              <span className="font-mono text-[9.5px] text-muted flex-none w-[90px]">{new Date(incident.resolvedAt).toLocaleString()}</span>
              <span className="flex-1">Resolved.</span>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
