"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, GitPullRequest, HelpCircle } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Textarea } from "@/components/shadcn/textarea";
import { Label } from "@/components/shadcn/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/shadcn/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/shadcn/select";
import { submitPublicClientSubmission, type PublicSubmitResult } from "@/app/s/[token]/submit-actions";
import type { ClientSubmissionKind } from "@/lib/supabase/database.types";

type Option = { value: string; label: string };

const KIND_META: Record<ClientSubmissionKind, { label: string; hint: string; cta: string; titlePlaceholder: string; icon: typeof AlertTriangle }> = {
  issue: {
    label: "Report an issue",
    hint: "Something's not working",
    cta: "Report issue",
    titlePlaceholder: "Order sync is failing",
    icon: AlertTriangle,
  },
  change_request: {
    label: "Change request",
    hint: "Ask for something different",
    cta: "Raise change request",
    titlePlaceholder: "Add a second recall channel",
    icon: GitPullRequest,
  },
  question: {
    label: "Ask a question",
    hint: "Not sure how something works",
    cta: "Send question",
    titlePlaceholder: "How do I read the prep sheet export?",
    icon: HelpCircle,
  },
};

/** Shared between /s/[token] (Delivery's P·1) and /s/hypercare/[token] —
 * identical form, different anonymous-submit RPC underneath (each
 * resolves client_id off its own kind of token). Defaults to Delivery's
 * action so the original caller needed no change when this moved here. */
export function PublicSubmissionForm({
  token,
  kind,
  categoryOptions = [],
  severityOptions = [],
  priorityOptions = [],
  submitAction = submitPublicClientSubmission,
}: {
  token: string;
  kind: ClientSubmissionKind;
  categoryOptions?: Option[];
  severityOptions?: Option[];
  priorityOptions?: Option[];
  submitAction?: (
    token: string,
    fields: {
      kind: ClientSubmissionKind;
      title: string;
      description: string;
      category?: string;
      severity?: string;
      priority?: string;
      businessImpact?: string;
    }
  ) => Promise<PublicSubmitResult>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [priority, setPriority] = useState("");
  const [businessImpact, setBusinessImpact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const meta = KIND_META[kind];

  function reset() {
    setTitle("");
    setDescription("");
    setCategory("");
    setSeverity("");
    setPriority("");
    setBusinessImpact("");
    setError(null);
    setDone(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex-1 min-w-[168px] flex items-center gap-2.5 rounded-[10px] border border-line bg-white px-3.5 py-3 text-left transition-colors hover:border-coral/40 hover:bg-coral-tint/30"
          />
        }
      >
        <span className="flex-none w-8 h-8 rounded-[8px] bg-coral-tint flex items-center justify-center">
          <meta.icon className="w-4 h-4 text-coral-strong" aria-hidden />
        </span>
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[12.5px] font-semibold text-ink">{meta.label}</span>
          <span className="text-[10.5px] text-muted truncate">{meta.hint}</span>
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.label}</DialogTitle>
          <DialogDescription>No login needed — the team is notified as soon as you send this.</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-ok-fg)]">Sent. The team has been notified and will follow up.</p>
            <Button variant="default" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await submitAction(token, {
                  kind,
                  title,
                  description,
                  category: category || undefined,
                  severity: severity || undefined,
                  priority: priority || undefined,
                  businessImpact: businessImpact || undefined,
                });
                if (!result.ok) {
                  setError(result.message ?? "Could not submit.");
                  return;
                }
                setDone(true);
              });
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${kind}-title`}>Title</Label>
              <Input id={`${kind}-title`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={meta.titlePlaceholder} required autoFocus />
            </div>

            {kind === "issue" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v ?? "")} items={categoryOptions}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Severity</Label>
                  <Select value={severity} onValueChange={(v) => setSeverity(v ?? "")} items={severityOptions}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="How disruptive is this?" />
                    </SelectTrigger>
                    <SelectContent>
                      {severityOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            {kind === "change_request" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="business-impact">Business impact</Label>
                  <Textarea
                    id="business-impact"
                    rows={2}
                    value={businessImpact}
                    onChange={(e) => setBusinessImpact(e.target.value)}
                    placeholder="Who does this affect, and how?"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v ?? "")} items={priorityOptions}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${kind}-description`}>{kind === "question" ? "Your question" : "Description"}</Label>
              <Textarea
                id={`${kind}-description`}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="As much detail as you can share."
                required
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending..." : meta.cta}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
