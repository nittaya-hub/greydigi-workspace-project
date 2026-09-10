"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import type { MemberRow } from "@/lib/data/admin";
import type { WorkspaceRole } from "@/lib/supabase/database.types";
import { withTimeout } from "@/lib/withTimeout";
import { removeMemberAccess, setMemberActive, toggleProductAccess, updateMemberRole } from "@/app/(app)/people/actions";

const PAGE_SIZE = 20;

const ROLE_OPTIONS: { value: WorkspaceRole; label: string }[] = [
  { value: "workspace_admin", label: "Workspace admin" },
  { value: "delivery_lead", label: "Delivery lead" },
  { value: "product_lead", label: "Product lead" },
  { value: "hypercare_lead", label: "Hypercare lead" },
  { value: "member", label: "Member" },
];

function ActiveSwitch({ personId, isActive }: { personId: string; isActive: boolean }) {
  const [optimistic, setOptimistic] = useState(isActive);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label={optimistic ? "Deactivate user" : "Activate user"}
      onClick={() => {
        const next = !optimistic;
        setOptimistic(next);
        startTransition(() => {
          withTimeout(setMemberActive(personId, next)).catch(() => setOptimistic(!next));
        });
      }}
      className={clsx(
        "w-9 h-5 rounded-full flex-none relative transition-colors",
        optimistic ? "bg-coral" : "bg-line"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          optimistic ? "translate-x-[18px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function RoleSelect({ personId, role }: { personId: string; role: string }) {
  const [optimistic, setOptimistic] = useState(role);
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={optimistic}
      disabled={isPending}
      items={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label.toUpperCase() }))}
      onValueChange={(next) => {
        const nextRole = next as WorkspaceRole;
        const prev = optimistic;
        setOptimistic(nextRole);
        startTransition(() => {
          withTimeout(updateMemberRole(personId, nextRole)).catch(() => setOptimistic(prev));
        });
      }}
    >
      <SelectTrigger className="h-auto rounded-[5px] border-line px-1.5 py-1 font-mono text-[9.5px] disabled:opacity-50">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="font-mono text-[10px]">
            {o.label.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RemoveButton({ personId, fullName }: { personId: string; fullName: string }) {
  return (
    <ConfirmButton
      triggerLabel="REMOVE"
      triggerClassName="font-mono text-[9px] text-muted hover:text-block-fg"
      title="Remove access"
      message={
        <>
          Remove <b>{fullName}</b>&apos;s access? They won&apos;t be able to sign in again.
        </>
      }
      confirmLabel="Remove access"
      onConfirm={() => withTimeout(removeMemberAccess(personId))}
    />
  );
}

const COLS = "1.4fr 130px 70px 70px 70px 60px 70px";

/** The renamed, moved "Users and members" table — now "User Access"
 * under Settings -> Permissions. Filter chips (unchanged), plus (admin
 * only) inline role editing, active/inactive toggle, and a remove
 * action — the CRUD the People page never had. Paginates client-side at
 * 20 rows since the full list is already fetched server-side and typical
 * workspaces are small; a DB-level LIMIT/OFFSET isn't worth the added
 * query complexity at this scale. */
export function UserAccessTable({ members, viewerIsAdmin }: { members: MemberRow[]; viewerIsAdmin: boolean }) {
  const [filter, setFilter] = useState<"all" | "internal" | "client">("all");
  const [page, setPage] = useState(0);

  const filtered = members.filter((m) => filter === "all" || m.kind === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const internalCount = members.filter((m) => m.kind === "internal").length;
  const clientCount = members.filter((m) => m.kind === "client").length;

  function setFilterAndResetPage(next: typeof filter) {
    setFilter(next);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {(
            [
              ["all", `ALL ${members.length}`],
              ["internal", `INTERNAL ${internalCount}`],
              ["client", `CLIENT ${clientCount}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterAndResetPage(key)}
              className={clsx(
                "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
                filter === key ? "bg-ink text-white" : "border border-line text-coral"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <LinkButton href="/people/invite" variant="primary" className="flex-none">
          Invite
        </LinkButton>
      </div>

      <div className="bg-white border border-line rounded-[12px] overflow-hidden">
        <div style={{ gridTemplateColumns: COLS }} className="grid gap-2 px-4 py-2.5 bg-[#FCFCFA] border-b border-line-soft font-mono text-[9px] tracking-[.08em] text-muted">
          <span>PERSON</span>
          <span>ROLE</span>
          <span>DELIVERY</span>
          <span>PRODUCT</span>
          <span>HYPERCARE</span>
          <span>ACTIVE</span>
          <span />
        </div>
        {pageRows.length === 0 ? (
          <div className="px-4 py-6 text-[12px] text-muted">No one matches this filter.</div>
        ) : (
          pageRows.map((m, i) => (
            <div
              key={m.id}
              style={{ gridTemplateColumns: COLS }}
              className={clsx(
                "grid gap-2 items-center px-4 py-[11px] text-[12px]",
                i < pageRows.length - 1 && "border-b border-line-soft",
                !m.isActive && "opacity-50"
              )}
            >
              <span className="flex flex-col gap-0.5 min-w-0">
                {m.kind === "internal" ? (
                  <Link href={`/people/${m.id}`} className="text-[12.5px] font-semibold text-ink hover:text-coral w-fit truncate">
                    {m.fullName}
                  </Link>
                ) : (
                  <span className="text-[12.5px] font-semibold text-ink truncate">{m.fullName}</span>
                )}
                <span className="font-mono text-[9.5px] text-muted truncate">
                  {m.clientName ? `${m.kind.toUpperCase()} · ${m.clientName.toUpperCase()}` : m.kind.toUpperCase()}
                  {!m.hasPortalAccess && m.kind === "client" ? " · INVITED" : ""}
                  {!m.isActive ? " · INACTIVE" : ""}
                </span>
              </span>
              {viewerIsAdmin && m.kind === "internal" ? (
                <RoleSelect personId={m.id} role={m.workspaceRole} />
              ) : (
                <span className="font-mono text-[9.5px] text-muted">{m.workspaceRole === "client" ? "—" : m.workspaceRole.toUpperCase()}</span>
              )}
              {(["delivery", "product", "hypercare"] as const).map((space) => {
                if (space === "product" && viewerIsAdmin && m.kind === "internal" && m.workspaceRole !== "workspace_admin") {
                  return <ProductAccessToggleInline key={space} personId={m.id} hasAccess={!!m.spaceRoles.product} />;
                }
                return (
                  <span key={space} className="font-mono text-[9.5px] text-muted">
                    {m.workspaceRole === "workspace_admin" ? "ADMIN" : (m.spaceRoles[space] ?? "—").toUpperCase()}
                  </span>
                );
              })}
              {viewerIsAdmin ? (
                <ActiveSwitch personId={m.id} isActive={m.isActive} />
              ) : (
                <span className="font-mono text-[9.5px] text-muted">{m.isActive ? "YES" : "NO"}</span>
              )}
              {viewerIsAdmin ? <RemoveButton personId={m.id} fullName={m.fullName} /> : <span />}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] text-muted">
            PAGE {currentPage + 1} OF {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="font-mono text-[9.5px] text-muted hover:text-ink disabled:opacity-40 border border-line rounded-[6px] px-2.5 py-1"
            >
              PREV
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="font-mono text-[9.5px] text-muted hover:text-ink disabled:opacity-40 border border-line rounded-[6px] px-2.5 py-1"
            >
              NEXT
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Same Grant/Revoke idiom as the old ProductAccessToggle (kept there
 * too, for any other caller) — inlined here since it needs the shared
 * withTimeout wrapper this table's other actions use. */
function ProductAccessToggleInline({ personId, hasAccess }: { personId: string; hasAccess: boolean }) {
  const [optimistic, setOptimistic] = useState(hasAccess);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const next = !optimistic;
        setOptimistic(next);
        startTransition(() => {
          withTimeout(toggleProductAccess(personId, next)).catch(() => setOptimistic(!next));
        });
      }}
      className="font-mono text-[9.5px] text-muted hover:text-coral disabled:opacity-50 text-left"
    >
      {isPending ? "…" : optimistic ? "MEMBER · REVOKE" : "GRANT"}
    </button>
  );
}
