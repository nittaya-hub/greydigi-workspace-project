"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { StatTile, Eyebrow } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Field, Modal } from "@/components/ui/Modal";
import { DatePicker } from "@/components/ui/DatePicker";
import { publishHypercareReport, previewHypercareReport } from "./actions";
import type { HypercareReportData } from "@/lib/data/hypercare-report";
import { getSiteUrl } from "@/lib/site-url";

const HEALTH_TONE: Record<string, "blocked" | "watch" | "done"> = { at_risk: "blocked", watch: "watch", healthy: "done" };
const HEALTH_LABEL: Record<string, string> = { at_risk: "AT RISK", watch: "WATCH", healthy: "HEALTHY" };
const SEVERITY_LABEL: Record<string, string> = { sev1: "P1", sev2: "P2", sev3: "P3" };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Defaults to the last 7 days — a sensible weekly-report starting
 * point — but the period is always adjustable, per the explicit ask:
 * an official, period-selectable snapshot for whichever week (or other
 * span) is being reported. The preview panel (right column) loads
 * automatically on mount and again on every period change — matching
 * Client view config's always-visible live preview instead of the
 * click-to-load button this used to be — so what's on screen while
 * choosing a period is always what "Publish" would freeze. */
export function PublishReportForm({ clientId }: { clientId: string }) {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000);
  const [periodStart, setPeriodStart] = useState(isoDate(weekAgo));
  const [periodEnd, setPeriodEnd] = useState(isoDate(today));
  const [error, setError] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [preview, setPreview] = useState<HypercareReportData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();

  useEffect(() => {
    let active = true;
    startPreviewTransition(async () => {
      setPreviewError(null);
      try {
        const data = (await previewHypercareReport(clientId, periodStart, periodEnd)) as HypercareReportData;
        if (active) setPreview(data);
      } catch (err) {
        if (active) {
          setPreview(null);
          setPreviewError(err instanceof Error ? err.message : "Could not load the preview.");
        }
      }
    });
    return () => {
      active = false;
    };
  }, [clientId, periodStart, periodEnd]);

  const openIncidents = (preview?.incidents ?? []).filter((i) => i.status !== "resolved");
  const breached = (preview?.incidents ?? []).filter((i) => i.breach_at && new Date(i.breach_at) < new Date() && i.status !== "resolved");

  function doPublish() {
    setConfirmOpen(false);
    setError(null);
    setNewLink(null);
    startTransition(async () => {
      try {
        const { token } = await publishHypercareReport(clientId, periodStart, periodEnd);
        setNewLink(`${getSiteUrl() ?? ""}/s/hypercare/${token}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not publish.");
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="PERIOD START">
            <DatePicker value={periodStart} onChange={setPeriodStart} />
          </Field>
          <Field label="PERIOD END">
            <DatePicker value={periodEnd} onChange={setPeriodEnd} />
          </Field>
        </div>

        {error ? <p className="m-0 text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

        {newLink ? (
          <div className="flex items-center gap-2 w-full">
            <input
              readOnly
              value={newLink}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 border border-line bg-white rounded-full px-3.5 py-2 text-[12px] text-muted font-mono truncate"
            />
            <Button
              type="button"
              variant="primary"
              className="flex-none !rounded-full"
              onClick={async () => {
                await navigator.clipboard.writeText(newLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        ) : null}

        <Button variant="coral" type="button" disabled={isPending} onClick={() => setConfirmOpen(true)}>
          {isPending ? "Publishing..." : "Publish report for this period"}
        </Button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm publish">
        <div className="flex flex-col gap-3.5">
          <p className="m-0 text-[12.5px] text-muted leading-[1.5]">
            This freezes the preview on the right into a new no-login link for{" "}
            <span className="font-semibold text-ink">
              {periodStart} → {periodEnd}
            </span>
            . Earlier published links keep working — this adds a new one, it doesn&apos;t replace anything.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatTile label="OPEN INCIDENTS" value={openIncidents.length} accent={openIncidents.length > 0} />
            <StatTile label="SLA BREACHED" value={breached.length} accent={breached.length > 0} />
            <StatTile label="SERVICES" value={preview?.services?.length ?? 0} />
            <StatTile label="REQUEST BACKLOG" value={preview?.request_backlog?.length ?? 0} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="coral" type="button" disabled={isPending} onClick={doPublish}>
              {isPending ? "Publishing..." : "Confirm and publish"}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex flex-col gap-2 min-w-0">
        <Eyebrow>LIVE PREVIEW, DRAFT STATE</Eyebrow>
        <div className="flex flex-col gap-3 border border-line rounded-[10px] p-3.5 bg-[#FCFCFA] min-h-[180px]">
          {previewError ? (
            <p className="m-0 text-[11.5px] text-block-fg leading-[1.5]">{previewError}</p>
          ) : !preview ? (
            <span className="text-[11.5px] text-muted">{isPreviewPending ? "Loading preview…" : "No data for this period yet."}</span>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatTile label="OPEN INCIDENTS" value={openIncidents.length} accent={openIncidents.length > 0} />
                <StatTile label="SLA BREACHED" value={breached.length} accent={breached.length > 0} />
                <StatTile label="SERVICES" value={preview.services?.length ?? 0} />
                <StatTile label="REQUEST BACKLOG" value={preview.request_backlog?.length ?? 0} />
              </div>

              {preview.services && preview.services.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] tracking-[.07em] text-muted">SERVICES</span>
                  {preview.services.map((s) => (
                    <div key={s.ref} className="flex justify-between text-[12px]">
                      <span className="text-ink">{s.name}</span>
                      <Pill tone={HEALTH_TONE[s.health] ?? "idle"}>{HEALTH_LABEL[s.health] ?? s.health.toUpperCase()}</Pill>
                    </div>
                  ))}
                </div>
              ) : null}

              {preview.incidents && preview.incidents.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] tracking-[.07em] text-muted">INCIDENTS IN THIS PERIOD</span>
                  {preview.incidents.map((i) => (
                    <div key={i.ref} className="flex justify-between text-[12px] gap-2">
                      <span className="text-ink truncate">{i.title}</span>
                      <Pill tone={i.severity === "sev1" ? "blocked" : i.severity === "sev2" ? "in_progress" : "idle"}>
                        {SEVERITY_LABEL[i.severity] ?? i.severity.toUpperCase()}
                      </Pill>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[11.5px] text-muted">No incidents opened in this period.</span>
              )}

              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-line-soft">
                <span className="font-mono text-[9px] tracking-[.07em] text-muted mr-1">SUBMISSION CARDS</span>
                {preview.submissions.issue ? <Pill tone="idle">REPORT AN ISSUE</Pill> : null}
                {preview.submissions.change_request ? <Pill tone="idle">CHANGE REQUEST</Pill> : null}
                {preview.submissions.question ? <Pill tone="idle">ASK A QUESTION</Pill> : null}
                {!preview.submissions.issue && !preview.submissions.change_request && !preview.submissions.question ? (
                  <span className="text-[11px] text-muted">None enabled</span>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
