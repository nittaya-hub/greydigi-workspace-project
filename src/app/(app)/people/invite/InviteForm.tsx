"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { inviteMember, type InviteResult } from "./actions";

const ROLES = [
  { value: "member", label: "Member" },
  { value: "delivery_lead", label: "Delivery lead" },
  { value: "product_lead", label: "Product lead" },
  { value: "hypercare_lead", label: "Hypercare lead" },
  { value: "workspace_admin", label: "Workspace admin" },
];

export function InviteForm() {
  const [result, setResult] = useState<InviteResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  if (result?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-ok-bg border border-ok-fg/30 rounded-[9px] p-4 flex flex-col gap-3">
          <span className="text-[12.5px] text-ok-fg leading-[1.5]">{result.message}</span>
          {result.temporaryPassword ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-line rounded-[7px] px-3 py-2 text-[13px] font-mono">
                {result.temporaryPassword}
              </code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(result.temporaryPassword!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="border border-line bg-white rounded-[9px] px-3 py-2 text-[11.5px] text-ink"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex gap-1.5">
          <Link href="/people" className="bg-ink text-white rounded-[9px] px-[13px] py-[9px] text-[11.5px] font-semibold">
            Back to Users and members
          </Link>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="border border-line bg-white rounded-[9px] px-[13px] py-[9px] text-[11.5px] text-ink"
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await inviteMember(formData);
          setResult(res);
        });
      }}
      className="flex flex-col gap-3 max-w-[420px]"
    >
      <Field label="FULL NAME">
        <input
          name="fullName"
          required
          className="border border-line bg-white rounded-[9px] px-[11px] py-[9px] text-[12.5px]"
          placeholder="Jane Doe"
        />
      </Field>
      <Field label="EMAIL">
        <input
          name="email"
          type="email"
          required
          className="border border-line bg-white rounded-[9px] px-[11px] py-[9px] text-[12.5px]"
          placeholder="jane@greydigi.com"
        />
      </Field>
      <Field label="WORKSPACE ROLE">
        <SelectField name="workspaceRole" defaultValue="member" options={ROLES} />
      </Field>
      <Field label="TEMPORARY PASSWORD (LEAVE BLANK TO GENERATE ONE)">
        <input
          name="password"
          type="text"
          minLength={8}
          className="border border-line bg-white rounded-[9px] px-[11px] py-[9px] text-[12.5px]"
          placeholder="At least 8 characters"
        />
      </Field>

      {result && !result.ok ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{result.message}</p> : null}

      <Button variant="primary" type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add member"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[9px] tracking-[.09em] text-muted">{label}</span>
      {children}
    </label>
  );
}
