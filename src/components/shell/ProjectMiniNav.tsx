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

const PROJECT_REF_RE = /^\/delivery\/projects\/([^/]+)/;

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

  const base = `/delivery/projects/${project.ref.toLowerCase()}`;
  const items: { label: string; href: string; note?: string }[] = [
    { label: "Overview", href: base },
    { label: "Tasks and milestones", href: `${base}/tasks`, note: String(project.taskCount) },
    { label: "Client view config", href: `${base}/client-view-config` },
  ];
  if (project.linkedServiceRef) {
    items.push({
      label: "Hypercare service",
      href: `/hypercare/services/${project.linkedServiceRef.toLowerCase()}`,
      note: "LINKED",
    });
  }

  return (
    <>
      <div className="flex flex-col gap-1 px-2 pt-4 pb-1 font-mono text-[8.5px] tracking-[.1em] text-muted-2">
        <span>PROJECT</span>
        <span className="font-body text-[11.5px] font-semibold tracking-normal text-[#EDEEF1] leading-[1.35] normal-case">
          {project.name}
        </span>
        {project.clientName ? <span className="font-mono text-[9px] tracking-[.04em] text-muted-2 normal-case">{project.clientName}</span> : null}
      </div>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-[9px] rounded-[7px] px-2 py-1.5 text-[12px]",
              active ? "font-semibold text-white bg-white/8" : "text-[#B9BDC7] hover:text-white"
            )}
          >
            <span
              className={clsx("w-0.5 h-3.5 flex-none rounded-sm", active ? "bg-coral" : "bg-transparent")}
            />
            <span className="flex-1">{item.label}</span>
            {item.note ? <span className="font-mono text-[9.5px] text-muted-2">{item.note}</span> : null}
          </Link>
        );
      })}
    </>
  );
}
