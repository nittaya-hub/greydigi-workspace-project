"use client";

import { useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import {
  createAgentDefinition,
  createAgentConnection,
  saveDeploymentDraft,
  runTaskTest,
  activateDeployment,
} from "./../actions";
import type { AgentConnectorType, AgentConnectionRow, AgentDefinitionRow } from "@/lib/data/agents";

type Project = { id: string; ref: string; name: string };
type Person = { id: string; fullName: string };

const STEPS = ["Choose", "Connect", "Scope", "Automate", "Test & activate"] as const;

/** All five steps of the wizard live in one component with one piece of
 * local state, saved to the same draft deployment row on every step —
 * "Save draft and Back controls" throughout (blueprint section 11.1).
 * There is deliberately no client-side-only "preview" mode: every save
 * is a real row, because the point of this pass is to prove the
 * reusable-definition/scoped-deployment model actually persists, not to
 * mock a UI on top of nothing. */
export function ConnectWizard({
  definitions,
  connections,
  projects,
  people,
}: {
  definitions: AgentDefinitionRow[];
  connections: AgentConnectionRow[];
  projects: Project[];
  people: Person[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Step 1
  const [definitionMode, setDefinitionMode] = useState<"existing" | "new">(definitions.length ? "existing" : "new");
  const [definitionId, setDefinitionId] = useState<string>(definitions[0]?.id ?? "");
  const [newDefName, setNewDefName] = useState("");
  const [newDefPurpose, setNewDefPurpose] = useState("");
  const [newDefTask, setNewDefTask] = useState("Weekly checkpoint draft");
  const [newDefOwner, setNewDefOwner] = useState("");

  // Step 2
  const [connectionMode, setConnectionMode] = useState<"existing" | "new">(connections.length ? "existing" : "new");
  const [connectionId, setConnectionId] = useState<string>(connections[0]?.id ?? "");
  const [newConnName, setNewConnName] = useState("");
  const [newConnType, setNewConnType] = useState<AgentConnectorType>("external_api");
  const [newConnEndpoint, setNewConnEndpoint] = useState("");
  const [newConnAuth, setNewConnAuth] = useState("");
  const [newConnSecretRef, setNewConnSecretRef] = useState("");

  // Step 3
  const [projectId, setProjectId] = useState<string>("");
  const [scopeDescription, setScopeDescription] = useState("");
  const [canRead, setCanRead] = useState(true);
  const [canCreateDrafts, setCanCreateDrafts] = useState(true);
  const [canChangeRecords, setCanChangeRecords] = useState(false);

  // Step 4
  const [scheduleDescription, setScheduleDescription] = useState("Manual only, for now");
  const [timezone, setTimezone] = useState("Asia/Bangkok");
  const [ownerPersonId, setOwnerPersonId] = useState<string>("");
  const [reviewerPersonId, setReviewerPersonId] = useState<string>("");
  const [budgetNote, setBudgetNote] = useState("");

  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);

  function resolvedDefinitionName() {
    if (definitionMode === "existing") return definitions.find((d) => d.id === definitionId)?.name ?? "";
    return newDefName;
  }
  function resolvedConnectionName() {
    if (connectionMode === "existing") return connections.find((c) => c.id === connectionId)?.name ?? "";
    return newConnName;
  }

  async function saveDraft(): Promise<boolean> {
    setError(null);
    try {
      let finalDefinitionId = definitionId;
      if (definitionMode === "new") {
        if (!newDefName.trim() || !newDefPurpose.trim()) throw new Error("Give the new agent a name and a purpose before continuing.");
        const created = await createAgentDefinition({
          name: newDefName,
          purpose: newDefPurpose,
          taskTemplate: newDefTask,
          ownerPersonId: newDefOwner || null,
        });
        finalDefinitionId = created.id;
        setDefinitionId(created.id);
        setDefinitionMode("existing");
      }
      if (!finalDefinitionId) throw new Error("Choose or create an agent definition first.");

      let finalConnectionId: string | null = connectionId || null;
      if (connectionMode === "new" && newConnName.trim()) {
        const created = await createAgentConnection({
          name: newConnName,
          connectorType: newConnType,
          endpointUrl: newConnEndpoint || null,
          authMethod: newConnAuth || null,
          secretRef: newConnSecretRef || null,
        });
        finalConnectionId = created.id;
        setConnectionId(created.id);
        setConnectionMode("existing");
      }

      const saved = await saveDeploymentDraft({
        id: deploymentId ?? undefined,
        agentDefinitionId: finalDefinitionId,
        connectionId: finalConnectionId,
        projectId: projectId || null,
        scopeDescription,
        canRead,
        canCreateDrafts,
        canChangeRecords,
        canPublish: false,
        scheduleDescription,
        timezone,
        ownerPersonId: ownerPersonId || null,
        reviewerPersonId: reviewerPersonId || null,
        budgetNote,
      });
      setDeploymentId(saved.id);
      setSavedOnce(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      return false;
    }
  }

  function handleSaveDraft() {
    setNotice(null);
    startTransition(async () => {
      const ok = await saveDraft();
      if (ok) setNotice("Saved as draft.");
    });
  }

  function handleNext() {
    setNotice(null);
    startTransition(async () => {
      const ok = await saveDraft();
      if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    });
  }

  function handleBack() {
    setError(null);
    setNotice(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleRunTest() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        if (!deploymentId) throw new Error("Save a draft first.");
        await runTaskTest(deploymentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not run test.");
      }
    });
  }

  function handleActivate() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        if (!deploymentId) throw new Error("Save a draft first.");
        await activateDeployment(deploymentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not activate.");
      }
    });
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-1 px-4 pt-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-1">
            <div
              className={`flex items-center gap-2 text-[11px] font-semibold ${i === step ? "text-coral" : i < step ? "text-ink" : "text-muted"}`}
            >
              <span
                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold flex-none ${
                  i === step ? "bg-coral text-white" : i < step ? "bg-ink text-white" : "bg-line text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 ? <span className="flex-1 h-[1px] bg-line mx-1" /> : null}
          </div>
        ))}
      </div>

      <div className="px-5 py-5 flex flex-col gap-4">
        {step === 0 ? (
          <StepChoose
            definitions={definitions}
            people={people}
            mode={definitionMode}
            setMode={setDefinitionMode}
            definitionId={definitionId}
            setDefinitionId={setDefinitionId}
            name={newDefName}
            setName={setNewDefName}
            purpose={newDefPurpose}
            setPurpose={setNewDefPurpose}
            taskTemplate={newDefTask}
            setTaskTemplate={setNewDefTask}
            owner={newDefOwner}
            setOwner={setNewDefOwner}
          />
        ) : null}

        {step === 1 ? (
          <StepConnect
            connections={connections}
            mode={connectionMode}
            setMode={setConnectionMode}
            connectionId={connectionId}
            setConnectionId={setConnectionId}
            name={newConnName}
            setName={setNewConnName}
            type={newConnType}
            setType={setNewConnType}
            endpoint={newConnEndpoint}
            setEndpoint={setNewConnEndpoint}
            authMethod={newConnAuth}
            setAuthMethod={setNewConnAuth}
            secretRef={newConnSecretRef}
            setSecretRef={setNewConnSecretRef}
          />
        ) : null}

        {step === 2 ? (
          <StepScope
            projects={projects}
            projectId={projectId}
            setProjectId={setProjectId}
            scopeDescription={scopeDescription}
            setScopeDescription={setScopeDescription}
            canRead={canRead}
            setCanRead={setCanRead}
            canCreateDrafts={canCreateDrafts}
            setCanCreateDrafts={setCanCreateDrafts}
            canChangeRecords={canChangeRecords}
            setCanChangeRecords={setCanChangeRecords}
          />
        ) : null}

        {step === 3 ? (
          <StepAutomate
            people={people}
            scheduleDescription={scheduleDescription}
            setScheduleDescription={setScheduleDescription}
            timezone={timezone}
            setTimezone={setTimezone}
            ownerPersonId={ownerPersonId}
            setOwnerPersonId={setOwnerPersonId}
            reviewerPersonId={reviewerPersonId}
            setReviewerPersonId={setReviewerPersonId}
            budgetNote={budgetNote}
            setBudgetNote={setBudgetNote}
          />
        ) : null}

        {step === 4 ? (
          <StepTestActivate
            agentName={resolvedDefinitionName()}
            connectionName={resolvedConnectionName()}
            projectRef={projects.find((p) => p.id === projectId)?.ref ?? "none selected"}
            scheduleDescription={scheduleDescription}
            timezone={timezone}
            reviewerName={people.find((p) => p.id === reviewerPersonId)?.fullName ?? "none selected"}
            budgetNote={budgetNote}
            onRunTest={handleRunTest}
            onActivate={handleActivate}
            isPending={isPending}
            savedOnce={savedOnce}
          />
        ) : null}

        {error ? <p className="text-[11.5px] text-block-fg bg-block-bg rounded-[8px] px-3 py-2">{error}</p> : null}
        {notice && !error ? <p className="text-[11.5px] text-coral">{notice}</p> : null}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-line-soft mt-1">
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={handleBack} disabled={step === 0 || isPending}>
              Back
            </Button>
            <Button variant="ghost" type="button" onClick={handleSaveDraft} disabled={isPending}>
              {isPending ? "Saving..." : "Save draft"}
            </Button>
          </div>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" type="button" onClick={handleNext} disabled={isPending}>
              {isPending ? "Saving..." : "Next"}
            </Button>
          ) : (
            <Button variant="secondary" type="button" onClick={() => router.push("/manifest/agents")} disabled={isPending}>
              Done for now
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function StepChoose(props: {
  definitions: AgentDefinitionRow[];
  people: Person[];
  mode: "existing" | "new";
  setMode: (m: "existing" | "new") => void;
  definitionId: string;
  setDefinitionId: (id: string) => void;
  name: string;
  setName: (v: string) => void;
  purpose: string;
  setPurpose: (v: string) => void;
  taskTemplate: string;
  setTaskTemplate: (v: string) => void;
  owner: string;
  setOwner: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[12.5px] text-ink font-semibold">What should this agent do?</p>
      <ModeSwitch
        mode={props.mode}
        setMode={props.setMode}
        existingLabel="Use an approved agent from the registry"
        newLabel="Register a new agent"
        disableExisting={props.definitions.length === 0}
      />
      {props.mode === "existing" ? (
        <Field label="AGENT DEFINITION">
          <select className={fieldInputClass} value={props.definitionId} onChange={(e) => props.setDefinitionId(e.target.value)}>
            {props.definitions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.purpose}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5">
          <Field label="AGENT NAME">
            <input className={fieldInputClass} value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="Weekly Update Agent" />
          </Field>
          <Field label="TASK TEMPLATE">
            <select className={fieldInputClass} value={props.taskTemplate} onChange={(e) => props.setTaskTemplate(e.target.value)}>
              <option value="Weekly checkpoint draft">Weekly checkpoint draft</option>
              <option value="Incident triage draft">Incident triage draft</option>
              <option value="Gate evidence draft">Gate evidence draft</option>
            </select>
          </Field>
          <Field label="PURPOSE">
            <input
              className={fieldInputClass}
              value={props.purpose}
              onChange={(e) => props.setPurpose(e.target.value)}
              placeholder="Create a weekly checkpoint draft from this mission's progress, decisions and client actions."
            />
          </Field>
          <Field label="OWNER">
            <select className={fieldInputClass} value={props.owner} onChange={(e) => props.setOwner(e.target.value)}>
              <option value="">Not set</option>
              {props.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      <p className="text-[11px] text-muted leading-[1.5]">Only supported task templates are shown — no free-text &ldquo;do anything&rdquo; option.</p>
    </div>
  );
}

function StepConnect(props: {
  connections: AgentConnectionRow[];
  mode: "existing" | "new";
  setMode: (m: "existing" | "new") => void;
  connectionId: string;
  setConnectionId: (id: string) => void;
  name: string;
  setName: (v: string) => void;
  type: AgentConnectorType;
  setType: (v: AgentConnectorType) => void;
  endpoint: string;
  setEndpoint: (v: string) => void;
  authMethod: string;
  setAuthMethod: (v: string) => void;
  secretRef: string;
  setSecretRef: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[12.5px] text-ink font-semibold">Where does the agent run?</p>
      <ModeSwitch
        mode={props.mode}
        setMode={props.setMode}
        existingLabel="Reuse an existing connection"
        newLabel="Set up a new connection"
        disableExisting={props.connections.length === 0}
      />
      {props.mode === "existing" ? (
        <Field label="CONNECTION">
          <select className={fieldInputClass} value={props.connectionId} onChange={(e) => props.setConnectionId(e.target.value)}>
            {props.connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.connectorType.replace("_", " ")}) — {c.status.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5">
          <Field label="CONNECTION NAME">
            <input className={fieldInputClass} value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="Weekly Update Agent — prod" />
          </Field>
          <Field label="TRANSPORT">
            <select className={fieldInputClass} value={props.type} onChange={(e) => props.setType(e.target.value as AgentConnectorType)}>
              <option value="external_api">External API</option>
              <option value="n8n_workflow">n8n workflow</option>
            </select>
          </Field>
          <Field label="ENDPOINT / WORKFLOW URL">
            <input className={fieldInputClass} value={props.endpoint} onChange={(e) => props.setEndpoint(e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="AUTHENTICATION METHOD">
            <input className={fieldInputClass} value={props.authMethod} onChange={(e) => props.setAuthMethod(e.target.value)} placeholder="Bearer token" />
          </Field>
          <Field label="SECRET — LABEL ONLY, NOT THE SECRET ITSELF">
            <input
              className={fieldInputClass}
              value={props.secretRef}
              onChange={(e) => props.setSecretRef(e.target.value)}
              placeholder="e.g. 1Password: Weekly Update Agent prod key"
            />
          </Field>
        </div>
      )}
      <p className="text-[11px] text-muted leading-[1.5]">
        No real secret value is ever stored here — this field is a pointer for whoever manages the actual credential elsewhere.
        &ldquo;Test connection&rdquo; isn&rsquo;t offered yet because no connector adapter exists to test against (see step 5).
      </p>
    </div>
  );
}

function StepScope(props: {
  projects: Project[];
  projectId: string;
  setProjectId: (v: string) => void;
  scopeDescription: string;
  setScopeDescription: (v: string) => void;
  canRead: boolean;
  setCanRead: Dispatch<SetStateAction<boolean>>;
  canCreateDrafts: boolean;
  setCanCreateDrafts: Dispatch<SetStateAction<boolean>>;
  canChangeRecords: boolean;
  setCanChangeRecords: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[12.5px] text-ink font-semibold">What may the agent access and produce?</p>
      <Field label="MISSION">
        <select className={fieldInputClass} value={props.projectId} onChange={(e) => props.setProjectId(e.target.value)}>
          <option value="">Choose a mission…</option>
          {props.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ref} — {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="SCOPE DESCRIPTION">
        <textarea
          className={fieldInputClass}
          rows={2}
          value={props.scopeDescription}
          onChange={(e) => props.setScopeDescription(e.target.value)}
          placeholder="Read this mission's progress, decisions and client actions. Create a weekly checkpoint draft."
        />
      </Field>
      <div className="flex flex-col gap-2 border border-line rounded-[10px] p-3">
        <ToggleRow label="Read (progress, decisions, client actions, approved documents)" checked={props.canRead} onChange={() => props.setCanRead((v) => !v)} />
        <ToggleRow
          label="Create drafts (e.g. weekly checkpoint draft)"
          checked={props.canCreateDrafts}
          onChange={() => props.setCanCreateDrafts((v) => !v)}
        />
        <ToggleRow
          label="Change records (only explicitly supported actions — none exist yet)"
          checked={props.canChangeRecords}
          onChange={() => props.setCanChangeRecords((v) => !v)}
        />
        <ToggleRow label="Publish or send — disabled for this trial, always off" checked={false} onChange={() => {}} disabled />
      </div>
    </div>
  );
}

function StepAutomate(props: {
  people: Person[];
  scheduleDescription: string;
  setScheduleDescription: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  ownerPersonId: string;
  setOwnerPersonId: (v: string) => void;
  reviewerPersonId: string;
  setReviewerPersonId: (v: string) => void;
  budgetNote: string;
  setBudgetNote: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[12.5px] text-ink font-semibold">When should it run, and who handles the result?</p>
      <div className="grid sm:grid-cols-2 gap-2.5">
        <Field label="TRIGGER">
          <input
            className={fieldInputClass}
            value={props.scheduleDescription}
            onChange={(e) => props.setScheduleDescription(e.target.value)}
            placeholder="Manual only, for now"
          />
        </Field>
        <Field label="TIMEZONE">
          <input className={fieldInputClass} value={props.timezone} onChange={(e) => props.setTimezone(e.target.value)} />
        </Field>
        <Field label="OWNER">
          <select className={fieldInputClass} value={props.ownerPersonId} onChange={(e) => props.setOwnerPersonId(e.target.value)}>
            <option value="">Not set</option>
            {props.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="REVIEWER">
          <select className={fieldInputClass} value={props.reviewerPersonId} onChange={(e) => props.setReviewerPersonId(e.target.value)}>
            <option value="">Not set</option>
            {props.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="BUDGET NOTE (ALERT ONLY — NOT AN ENFORCED SPENDING LIMIT YET)">
        <textarea
          className={fieldInputClass}
          rows={2}
          value={props.budgetNote}
          onChange={(e) => props.setBudgetNote(e.target.value)}
          placeholder="e.g. Flag if this would run more than 5 times a week. No real usage/cost tracking exists yet — see Decision #8."
        />
      </Field>
      <p className="text-[11px] text-muted leading-[1.5]">
        This note is a reminder for a human, not a system-enforced cap. Nothing in this pass can actually stop a run based on spend, because
        nothing can run a real task yet.
      </p>
    </div>
  );
}

function StepTestActivate(props: {
  agentName: string;
  connectionName: string;
  projectRef: string;
  scheduleDescription: string;
  timezone: string;
  reviewerName: string;
  budgetNote: string;
  onRunTest: () => void;
  onActivate: () => void;
  isPending: boolean;
  savedOnce: boolean;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[12.5px] text-ink font-semibold">Does the deployment work as intended?</p>
      <div className="border border-line rounded-[10px] p-3.5 flex flex-col gap-1.5 bg-[#FCFCFA]">
        <SummaryRow label="Agent" value={props.agentName || "—"} />
        <SummaryRow label="Connection" value={props.connectionName || "—"} />
        <SummaryRow label="Mission" value={props.projectRef} />
        <SummaryRow label="Schedule" value={`${props.scheduleDescription || "—"} · ${props.timezone || "—"}`} />
        <SummaryRow label="Reviewer" value={props.reviewerName} />
        <SummaryRow label="Budget note" value={props.budgetNote || "none set"} />
      </div>
      {!props.savedOnce ? <p className="text-[11px] text-muted">Save a draft on an earlier step before running a test.</p> : null}
      <div className="flex gap-2">
        <Button variant="secondary" type="button" onClick={props.onRunTest} disabled={props.isPending}>
          Run test
        </Button>
        <Button variant="secondary" type="button" onClick={props.onActivate} disabled={props.isPending}>
          Activate
        </Button>
      </div>
      <p className="text-[11px] text-muted leading-[1.5]">
        Both buttons are real — they call the actual activation path, which currently always explains why it can&rsquo;t proceed
        (&ldquo;Integration required&rdquo;) rather than pretending to succeed. This deployment stays saved as a draft either way.
      </p>
    </div>
  );
}

function ModeSwitch({
  mode,
  setMode,
  existingLabel,
  newLabel,
  disableExisting,
}: {
  mode: "existing" | "new";
  setMode: (m: "existing" | "new") => void;
  existingLabel: string;
  newLabel: string;
  disableExisting?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={disableExisting}
        onClick={() => setMode("existing")}
        className={`flex-1 text-left px-3 py-2 rounded-[9px] border text-[11.5px] font-semibold transition-colors disabled:opacity-40 ${
          mode === "existing" ? "border-coral bg-coral/10 text-coral" : "border-line text-ink hover:bg-paper"
        }`}
      >
        {existingLabel}
      </button>
      <button
        type="button"
        onClick={() => setMode("new")}
        className={`flex-1 text-left px-3 py-2 rounded-[9px] border text-[11.5px] font-semibold transition-colors ${
          mode === "new" ? "border-coral bg-coral/10 text-coral" : "border-line text-ink hover:bg-paper"
        }`}
      >
        {newLabel}
      </button>
    </div>
  );
}

function ToggleRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-[11.5px] ${disabled ? "text-muted-2" : "text-ink"}`}>{label}</span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11.5px]">
      <span className="text-muted">{label}</span>
      <span className="text-ink font-semibold text-right">{value}</span>
    </div>
  );
}
