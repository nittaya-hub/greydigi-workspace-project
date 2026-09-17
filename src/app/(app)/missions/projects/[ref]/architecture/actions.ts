"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { requireMissionsLead } from "@/lib/data/auth-guard";

function basePath(projectRef: string) {
  return `/missions/projects/${projectRef.toLowerCase()}/architecture`;
}

function requiredString(formData: FormData, key: string): string {
  const value = (formData.get(key) as string | null)?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function optionalString(formData: FormData, key: string): string | null {
  const value = (formData.get(key) as string | null)?.trim();
  return value ? value : null;
}

// ---- Columns ----

export async function createArchitectureColumn(projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("project_architecture_columns")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("project_architecture_columns").insert({
    project_id: projectId,
    label: requiredString(formData, "label"),
    icon: optionalString(formData, "icon"),
    color_hex: optionalString(formData, "color_hex"),
    sort_order: nextSort,
  });
  if (error) throw new Error(error.message);
  revalidatePath(basePath(projectRef));
}

export async function updateArchitectureColumn(id: string, projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_architecture_columns")
    .update({
      label: requiredString(formData, "label"),
      icon: optionalString(formData, "icon"),
      color_hex: optionalString(formData, "color_hex"),
    })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(basePath(projectRef));
}

/** Deletes the column and every node in it (nodes cascade via FK);
 * any edge touching one of those nodes also cascades. */
export async function deleteArchitectureColumn(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_architecture_columns").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(basePath(projectRef));
}

// ---- Nodes ----

export async function createArchitectureNode(columnId: string, projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("project_architecture_nodes")
    .select("sort_order")
    .eq("column_id", columnId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("project_architecture_nodes").insert({
    project_id: projectId,
    column_id: columnId,
    label: requiredString(formData, "label"),
    detail: optionalString(formData, "detail"),
    icon: optionalString(formData, "icon"),
    sort_order: nextSort,
  });
  if (error) throw new Error(error.message);
  revalidatePath(basePath(projectRef));
}

export async function updateArchitectureNode(id: string, projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_architecture_nodes")
    .update({
      label: requiredString(formData, "label"),
      detail: optionalString(formData, "detail"),
      icon: optionalString(formData, "icon"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(basePath(projectRef));
}

/** Deletes the node; any edge touching it cascades via FK too. */
export async function deleteArchitectureNode(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_architecture_nodes").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(basePath(projectRef));
}

// ---- Edges ----

export async function createArchitectureEdge(
  projectId: string,
  projectRef: string,
  input: { fromNodeId: string; toNodeId: string; label: string | null }
) {
  await requireMissionsLead(projectId);
  if (input.fromNodeId === input.toNodeId) throw new Error("A connection needs two different modules.");
  const supabase = await createClient();

  const { error } = await supabase.from("project_architecture_edges").insert({
    project_id: projectId,
    from_node_id: input.fromNodeId,
    to_node_id: input.toNodeId,
    label: input.label?.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(basePath(projectRef));
}

export async function deleteArchitectureEdge(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_architecture_edges").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(basePath(projectRef));
}

// ---- Source files ----

export async function recordArchitectureSourceFile(
  projectId: string,
  projectRef: string,
  file: { path: string; name: string; size: number; type: string }
) {
  const person = await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { data: asset, error: assetError } = await supabase
    .from("file_assets")
    .insert({
      workspace_id: person.workspace_id,
      storage_path: file.path,
      original_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: person.id,
    })
    .select("id")
    .single();
  if (assetError || !asset) throw new Error(assetError?.message ?? "Could not record the uploaded file.");

  const { data: row, error } = await supabase
    .from("project_architecture_source_files")
    .insert({ project_id: projectId, file_asset_id: asset.id, uploaded_by: person.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(basePath(projectRef));
  return { id: row.id as string };
}

export async function deleteArchitectureSourceFile(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_architecture_source_files").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(basePath(projectRef));
}

interface ExcelImportRow {
  Column?: unknown;
  Node?: unknown;
  Detail?: unknown;
  Icon?: unknown;
  "Connects To"?: unknown;
}

function cellString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

/** Reads the first sheet of an uploaded .xlsx workbook and maps it onto
 * this diagram -- no AI involved, this is deterministic since a
 * spreadsheet is already structured data. Expected columns: Column,
 * Node, Detail (optional), Icon (optional), Connects To (optional,
 * comma-separated exact Node labels -- within this file or already in
 * the diagram). Additive only, same rule as every other import in this
 * app: existing columns/nodes/edges are never edited or removed, so
 * re-running an import (e.g. an updated sheet) is always safe to try,
 * at the cost of possible duplicates if labels repeat -- delete a
 * duplicate by hand same as any other row. */
export async function importArchitectureExcel(
  projectId: string,
  projectRef: string,
  sourceFileId: string
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  try {
    await requireMissionsLead(projectId);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Not authorized." };
  }

  const supabase = await createClient();

  const { data: sourceFile } = await supabase
    .from("project_architecture_source_files")
    .select("file_asset_id")
    .eq("id", sourceFileId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!sourceFile) return { ok: false, message: "Source file not found." };

  const { data: asset } = await supabase.from("file_assets").select("storage_path").eq("id", sourceFile.file_asset_id).maybeSingle();
  if (!asset) return { ok: false, message: "Source file not found." };

  const { data: blob, error: downloadError } = await supabase.storage.from("delivery-documents").download(asset.storage_path);
  if (downloadError || !blob) return { ok: false, message: `Couldn't read the file: ${downloadError?.message ?? "unknown error"}.` };

  let rows: ExcelImportRow[];
  try {
    const buffer = Buffer.from(await blob.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<ExcelImportRow>(firstSheet, { defval: "" });
  } catch {
    return { ok: false, message: "Couldn't read this as a spreadsheet. Export it as .xlsx and try again." };
  }
  if (rows.length === 0) return { ok: false, message: "That spreadsheet has no rows." };

  const { data: existingColumns } = await supabase
    .from("project_architecture_columns")
    .select("id, label, sort_order")
    .eq("project_id", projectId);
  const columnIdByLabel = new Map((existingColumns ?? []).map((c) => [c.label, c.id] as const));
  let nextColumnSort = Math.max(-1, ...(existingColumns ?? []).map((c) => c.sort_order)) + 1;

  const { data: existingNodes } = await supabase.from("project_architecture_nodes").select("id, label").eq("project_id", projectId);
  const nodeIdByLabel = new Map((existingNodes ?? []).map((n) => [n.label, n.id] as const));
  const nextSortByColumn = new Map<string, number>();

  let columnsCreated = 0;
  let nodesCreated = 0;
  const pendingEdges: { fromLabel: string; toLabel: string }[] = [];

  for (const row of rows) {
    const columnLabel = cellString(row.Column);
    const nodeLabel = cellString(row.Node);
    if (!columnLabel || !nodeLabel) continue;

    let columnId = columnIdByLabel.get(columnLabel);
    if (!columnId) {
      const { data: created, error } = await supabase
        .from("project_architecture_columns")
        .insert({ project_id: projectId, label: columnLabel, sort_order: nextColumnSort++ })
        .select("id")
        .single();
      if (error || !created) return { ok: false, message: `Couldn't create column "${columnLabel}": ${error?.message ?? "unknown error"}.` };
      columnId = created.id;
      columnIdByLabel.set(columnLabel, columnId);
      columnsCreated++;
    }

    const sortForColumn = nextSortByColumn.get(columnId) ?? 0;
    const { data: createdNode, error: nodeError } = await supabase
      .from("project_architecture_nodes")
      .insert({
        project_id: projectId,
        column_id: columnId,
        label: nodeLabel,
        detail: cellString(row.Detail) || null,
        icon: cellString(row.Icon) || null,
        sort_order: sortForColumn,
      })
      .select("id")
      .single();
    if (nodeError || !createdNode) return { ok: false, message: `Couldn't create module "${nodeLabel}": ${nodeError?.message ?? "unknown error"}.` };
    nextSortByColumn.set(columnId, sortForColumn + 1);
    nodeIdByLabel.set(nodeLabel, createdNode.id);
    nodesCreated++;

    const connectsTo = cellString(row["Connects To"]);
    if (connectsTo) {
      for (const target of connectsTo.split(",").map((t) => t.trim()).filter(Boolean)) {
        pendingEdges.push({ fromLabel: nodeLabel, toLabel: target });
      }
    }
  }

  let edgesCreated = 0;
  const skippedEdges: string[] = [];
  for (const edge of pendingEdges) {
    const fromId = nodeIdByLabel.get(edge.fromLabel);
    const toId = nodeIdByLabel.get(edge.toLabel);
    if (!fromId || !toId || fromId === toId) {
      skippedEdges.push(`${edge.fromLabel} → ${edge.toLabel}`);
      continue;
    }
    const { error } = await supabase.from("project_architecture_edges").insert({ project_id: projectId, from_node_id: fromId, to_node_id: toId });
    if (!error) edgesCreated++;
    else skippedEdges.push(`${edge.fromLabel} → ${edge.toLabel}`);
  }

  revalidatePath(basePath(projectRef));

  const parts = [`${columnsCreated} column(s)`, `${nodesCreated} module(s)`, `${edgesCreated} connection(s)`];
  let message = `Imported ${parts.join(", ")}.`;
  if (skippedEdges.length > 0) {
    message += ` Couldn't match ${skippedEdges.length} connection(s) to an exact module label: ${skippedEdges.slice(0, 3).join("; ")}${skippedEdges.length > 3 ? ", ..." : ""}.`;
  }
  return { ok: true, message };
}
