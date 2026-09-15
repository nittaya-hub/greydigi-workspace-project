"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";

interface MiniProject {
  ref: string;
  name: string;
  clientName: string | null;
  taskCount: number;
  linkedServiceRef: string | null;
}

const PROJECT_REF_RE = /^\/missions\/projects\/([^/]+)/;

/**
 * The "PROJECT" sidebar section (design source SHELL: Overview, Tasks and
 * milestones, Client view config, Hypercare service) — only rendered while
 * inside a specific delivery project's routes. Fetches its own small slice
 * of data client-side rather than threading project context through every
 * nested layout.
 */
export function ProjectMiniNav() {
  const pathname = usePathname();
  const match = pathname.match(PROJECT_REF_RE);
  const ref = match?.[1] ?? null;
  const [project, setProject] = useState<MiniProject | null>(null);

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("ref, name, id, client_id")
        .eq("ref", ref.toUpperCase())
        .maybeSingle();
      if (!data || cancelled) return;

      const [{ count: taskCount }, { data: service }, { data: client }] = await Promise.all([
        supabase
          .from("project_tasks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", data.id)
          .neq("status", "done"),
        supabase.from("services").select("ref").eq("origin_project_id", data.id).maybeSingle(),
        supabase.from("clients").select("name").eq("id", data.client_id).maybeSingle(),
      ]);

      if (cancelled) return;
      setProject({
        ref: data.ref,
        name: data.name,
        clientName: client?.name ?? null,
        taskCount: taskCount ?? 0,
        linkedServiceRef: service?.ref ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [ref]);

  if (!ref || !project || project.ref.toLowerCase() !== ref.toLowerCase()) return null;

  const base = `/missions/projects/${project.ref.toLowerCase()}`;
  // Grouped to match ProjectLayout's own tab order exactly (missions/
  // projects/[ref]/layout.tsx's `tabs` array is the single source of
  // truth this mirrors) — every tab on that page has a matching sidebar
  // entry now, including Checkpoint data, which this list was missing
  // (the previous version stopped at 9 of the layout's 10 tabs).
  const groups: { label: string; items: { label: string; href: string; note?: string }[] }[] = [
    { label: "", items: [{ label: "Overview", href: base }] },
    {
      label: "Delivery",
      items: [
        { label: "Tasks and milestones", href: `${base}/tasks`, note: String(project.taskCount) },
        { label: "Flight plan check", href: `${base}/flight-plan-check` },
        { label: "Documents", href: `${base}/documents` },
        { label: "Baselines", href: `${base}/baselines` },
        { label: "Change requests", href: `${base}/change-requests` },
      ],
    },
    {
      label: "Client",
      items: [
        { label: "Client updates", href: `${base}/client-updates` },
        { label: "Checkpoint data", href: `${base}/checkpoint` },
        { label: "Client view config", href: `${base}/client-view-config` },
      ],
    },
    {
      label: "Team",
      items: [
        { label: "Members", href: `${base}/members` },
        ...(project.linkedServiceRef
          ? [{ label: "Hypercare service", href: `/hypercare/services/${project.linkedServiceRef.toLowerCase()}`, note: "LINKED" }]
          : []),
      ],
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-1 px-2 pt-4 pb-1 font-mono text-[8.5px] tracking-[.1em] text-muted-2">
        <span>MISSION</span>
        <span className="font-body text-[11.5px] font-semibold tracking-normal text-[#EDEEF1] leading-[1.35] normal-case">
          {project.name}
        </span>
        {project.clientName ? <span className="font-mono text-[9px] tracking-[.04em] text-muted-2 normal-case">{project.clientName}</span> : null}
      </div>
      {groups.map((group) => (
        <div key={group.label || "top"} className="flex flex-col gap-0.5">
          {group.label ? (
            <span className="font-mono text-[8px] tracking-[.1em] text-muted-2 px-2 pt-2 pb-0.5">{group.label.toUpperCase()}</span>
          ) : null}
          {group.items.map((item) => {
            // Exact match for "Overview" (item.href === base, and every
            // other item's href also starts with base — startsWith alone
            // would make Overview stay lit on every tab). Every other
            // tab's own href is unique enough that startsWith safely also
            // covers its nested detail routes (e.g. tasks/[taskRef]).
            const active = item.href === base ? pathname === base : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-[9px] rounded-[7px] px-2 py-1.5 text-[12px]",
                  active ? "font-semibold text-white bg-white/8" : "text-[#B9BDC7] hover:text-white"
                )}
              >
                <span className={clsx("w-0.5 h-3.5 flex-none rounded-sm", active ? "bg-coral" : "bg-transparent")} />
                <span className="flex-1">{item.label}</span>
                {item.note ? <span className="font-mono text-[9.5px] text-muted-2">{item.note}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
