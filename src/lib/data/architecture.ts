import { createClient } from "@/lib/supabase/server";

export interface ArchitectureNode {
  id: string;
  columnId: string;
  label: string;
  detail: string | null;
  icon: string | null;
  iconImageUrl: string | null;
  sortOrder: number;
  posX: number | null;
  posY: number | null;
}

export interface ArchitectureColumn {
  id: string;
  label: string;
  icon: string | null;
  iconImageUrl: string | null;
  colorHex: string | null;
  sortOrder: number;
  nodes: ArchitectureNode[];
}

export interface ArchitectureEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string | null;
}

export interface ArchitectureNote {
  id: string;
  body: string;
  colorHex: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

export interface ProjectArchitectureData {
  columns: ArchitectureColumn[];
  edges: ArchitectureEdge[];
  notes: ArchitectureNote[];
}

/** The whole "REFERENCE · SOLUTION ARCHITECTURE" diagram for one
 * project -- columns (in order, a purely visual reference band now,
 * not a layout constraint), every node with its free (pos_x, pos_y)
 * canvas position, every edge between any two nodes (edges can cross
 * columns, so they're returned flat rather than nested), and every
 * freeform note pinned on the canvas. Never seeds anything on read,
 * same rule as every other diagram/timeline getter in this codebase --
 * an empty diagram is a real, valid state until someone adds the
 * first column. */
export async function getProjectArchitecture(projectId: string): Promise<ProjectArchitectureData> {
  const supabase = await createClient();
  const [{ data: columns }, { data: nodes }, { data: edges }, { data: notes }] = await Promise.all([
    supabase
      .from("project_architecture_columns")
      .select("id, label, icon, icon_image_url, color_hex, sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_architecture_nodes")
      .select("id, column_id, label, detail, icon, icon_image_url, sort_order, pos_x, pos_y")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase.from("project_architecture_edges").select("id, from_node_id, to_node_id, label").eq("project_id", projectId),
    supabase.from("project_architecture_notes").select("id, body, color_hex, pos_x, pos_y, width, height").eq("project_id", projectId),
  ]);

  const nodesByColumn = new Map<string, ArchitectureNode[]>();
  for (const n of nodes ?? []) {
    const list = nodesByColumn.get(n.column_id) ?? [];
    list.push({
      id: n.id,
      columnId: n.column_id,
      label: n.label,
      detail: n.detail,
      icon: n.icon,
      iconImageUrl: n.icon_image_url,
      sortOrder: n.sort_order,
      posX: n.pos_x,
      posY: n.pos_y,
    });
    nodesByColumn.set(n.column_id, list);
  }

  return {
    columns: (columns ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      iconImageUrl: c.icon_image_url,
      colorHex: c.color_hex,
      sortOrder: c.sort_order,
      nodes: nodesByColumn.get(c.id) ?? [],
    })),
    edges: (edges ?? []).map((e) => ({ id: e.id, fromNodeId: e.from_node_id, toNodeId: e.to_node_id, label: e.label })),
    notes: (notes ?? []).map((n) => ({
      id: n.id,
      body: n.body,
      colorHex: n.color_hex,
      posX: n.pos_x,
      posY: n.pos_y,
      width: n.width,
      height: n.height,
    })),
  };
}

export interface ArchitectureSourceFileRow {
  id: string;
  fileAssetId: string;
  storagePath: string;
  originalName: string;
  uploadedByName: string | null;
  createdAt: string;
}

/** Excel/spreadsheet files a diagram was imported from -- kept for
 * reference, same pattern as getCheckpointSourceFiles. */
export async function getArchitectureSourceFiles(projectId: string): Promise<ArchitectureSourceFileRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_architecture_source_files")
    .select("id, file_asset_id, uploaded_by, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const fileAssetIds = [...new Set(rows.map((r) => r.file_asset_id))];
  const uploaderIds = [...new Set(rows.map((r) => r.uploaded_by).filter((x): x is string => !!x))];
  const [{ data: assets }, { data: uploaders }] = await Promise.all([
    supabase.from("file_assets").select("id, storage_path, original_name").in("id", fileAssetIds),
    uploaderIds.length
      ? supabase.from("people").select("id, full_name").in("id", uploaderIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const assetById = new Map((assets ?? []).map((a) => [a.id, a] as const));
  const nameById = new Map((uploaders ?? []).map((p) => [p.id, p.full_name] as const));

  return rows.map((r) => {
    const asset = assetById.get(r.file_asset_id);
    return {
      id: r.id,
      fileAssetId: r.file_asset_id,
      storagePath: asset?.storage_path ?? "",
      originalName: asset?.original_name ?? "Untitled file",
      uploadedByName: r.uploaded_by ? nameById.get(r.uploaded_by) ?? null : null,
      createdAt: r.created_at,
    };
  });
}
