import { createClient } from "@/lib/supabase/server";

export interface ProductOverview {
  productCount: number;
  featuresInBuild: number;
  totalRoadmapItems: number;
  nextRelease: { code: string; readinessPct: number; targetDate: string | null } | null;
  deliveryBlockedRefs: string[];
  features: {
    ref: string;
    title: string;
    productName: string;
    releaseCode: string | null;
    status: string;
    blocksNote: string | null;
  }[];
  releaseDependents: { projectRef: string; projectName: string; note: string | null }[];
}

export async function getProductOverview(workspaceId: string): Promise<ProductOverview> {
  const supabase = await createClient();

  const { data: products } = await supabase.from("products").select("id, name").eq("workspace_id", workspaceId);
  const productIds = (products ?? []).map((p) => p.id);
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));

  const [{ data: roadmapItems }, { data: releases }] = await Promise.all([
    productIds.length
      ? supabase
          .from("roadmap_items")
          .select("ref, title, status, product_id, release_id, description")
          .in("product_id", productIds)
      : Promise.resolve({ data: [] as { ref: string; title: string; status: string; product_id: string; release_id: string | null; description: string | null }[] }),
    productIds.length
      ? supabase.from("releases").select("id, code, readiness_pct, target_date, status").in("product_id", productIds).order("target_date")
      : Promise.resolve({ data: [] as { id: string; code: string; readiness_pct: number; target_date: string | null; status: string }[] }),
  ]);

  const releaseCodeById = new Map((releases ?? []).map((r) => [r.id, r.code]));
  const nextRelease = (releases ?? []).find((r) => r.status !== "shipped") ?? null;

  const projectIds = productIds.length
    ? (await supabase.from("project_release_dependencies").select("project_id, release_id, note").in("release_id", (releases ?? []).map((r) => r.id)))
        .data ?? []
    : [];
  const relevantProjectIds = [...new Set(projectIds.map((d) => d.project_id))];
  const { data: depProjects } = relevantProjectIds.length
    ? await supabase.from("projects").select("id, ref, name").in("id", relevantProjectIds)
    : { data: [] as { id: string; ref: string; name: string }[] };
  const projectById = new Map((depProjects ?? []).map((p) => [p.id, p]));

  return {
    productCount: products?.length ?? 0,
    featuresInBuild: (roadmapItems ?? []).filter((r) => r.status === "in_progress").length,
    totalRoadmapItems: roadmapItems?.length ?? 0,
    nextRelease: nextRelease ? { code: nextRelease.code, readinessPct: nextRelease.readiness_pct, targetDate: nextRelease.target_date } : null,
    deliveryBlockedRefs: [...new Set(projectIds.map((d) => projectById.get(d.project_id)?.ref).filter((x): x is string => !!x))],
    features: (roadmapItems ?? []).map((r) => ({
      ref: r.ref,
      title: r.title,
      productName: productNameById.get(r.product_id) ?? "—",
      releaseCode: r.release_id ? (releaseCodeById.get(r.release_id) ?? null) : null,
      status: r.status,
      blocksNote: null,
    })),
    releaseDependents: projectIds.map((d) => ({
      projectRef: projectById.get(d.project_id)?.ref ?? "",
      projectName: projectById.get(d.project_id)?.name ?? "",
      note: d.note,
    })),
  };
}

export interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  featureCount: number;
  usedByCount: number;
}

export async function listProducts(workspaceId: string): Promise<ProductRow[]> {
  const supabase = await createClient();
  const { data: products } = await supabase.from("products").select("id, name, description").eq("workspace_id", workspaceId);
  if (!products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const [{ data: items }, { data: releases }] = await Promise.all([
    supabase.from("roadmap_items").select("id, product_id").in("product_id", productIds),
    supabase.from("releases").select("id, product_id").in("product_id", productIds),
  ]);
  const releaseIds = (releases ?? []).map((r) => r.id);
  const { data: deps } = releaseIds.length
    ? await supabase.from("project_release_dependencies").select("project_id, release_id").in("release_id", releaseIds)
    : { data: [] as { project_id: string; release_id: string }[] };
  const releaseByProduct = new Map<string, string[]>();
  for (const r of releases ?? []) releaseByProduct.set(r.product_id, [...(releaseByProduct.get(r.product_id) ?? []), r.id]);

  const featureCountByProduct = new Map<string, number>();
  for (const i of items ?? []) featureCountByProduct.set(i.product_id, (featureCountByProduct.get(i.product_id) ?? 0) + 1);

  return products.map((p) => {
    const releaseIdsForProduct = new Set(releaseByProduct.get(p.id) ?? []);
    const usedBy = new Set((deps ?? []).filter((d) => releaseIdsForProduct.has(d.release_id)).map((d) => d.project_id));
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      featureCount: featureCountByProduct.get(p.id) ?? 0,
      usedByCount: usedBy.size,
    };
  });
}

export interface FeatureRow {
  id: string;
  ref: string;
  title: string;
  kind: string;
  status: string;
  productName: string;
  releaseCode: string | null;
  clientVisible: boolean;
}

export async function listFeatures(workspaceId: string): Promise<FeatureRow[]> {
  const supabase = await createClient();
  const { data: products } = await supabase.from("products").select("id, name").eq("workspace_id", workspaceId);
  const productIds = (products ?? []).map((p) => p.id);
  if (productIds.length === 0) return [];
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));

  const { data: items } = await supabase
    .from("roadmap_items")
    .select("id, ref, title, kind, status, product_id, release_id, client_visible")
    .in("product_id", productIds)
    .order("ref");

  const releaseIds = [...new Set((items ?? []).map((i) => i.release_id).filter((x): x is string => !!x))];
  const { data: releases } = releaseIds.length
    ? await supabase.from("releases").select("id, code").in("id", releaseIds)
    : { data: [] as { id: string; code: string }[] };
  const releaseCodeById = new Map((releases ?? []).map((r) => [r.id, r.code]));

  return (items ?? []).map((i) => ({
    id: i.id,
    ref: i.ref,
    title: i.title,
    kind: i.kind,
    status: i.status,
    productName: productNameById.get(i.product_id) ?? "—",
    releaseCode: i.release_id ? (releaseCodeById.get(i.release_id) ?? null) : null,
    clientVisible: i.client_visible ?? false,
  }));
}

export interface ReleaseRow {
  code: string;
  name: string;
  targetDate: string | null;
  readinessPct: number;
  status: string;
  productName: string;
}

export async function listReleases(workspaceId: string): Promise<ReleaseRow[]> {
  const supabase = await createClient();
  const { data: products } = await supabase.from("products").select("id, name").eq("workspace_id", workspaceId);
  const productIds = (products ?? []).map((p) => p.id);
  if (productIds.length === 0) return [];
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));

  const { data: releases } = await supabase
    .from("releases")
    .select("code, name, target_date, readiness_pct, status, product_id")
    .in("product_id", productIds)
    .order("target_date");

  return (releases ?? []).map((r) => ({
    code: r.code,
    name: r.name,
    targetDate: r.target_date,
    readinessPct: r.readiness_pct,
    status: r.status,
    productName: productNameById.get(r.product_id) ?? "—",
  }));
}

export interface RoadmapColumn {
  label: string;
  releaseCode: string | null;
  items: { ref: string; title: string; note: string | null }[];
}

export async function getRoadmapBoard(workspaceId: string): Promise<RoadmapColumn[]> {
  const supabase = await createClient();
  const { data: products } = await supabase.from("products").select("id").eq("workspace_id", workspaceId);
  const productIds = (products ?? []).map((p) => p.id);
  if (productIds.length === 0) return [];

  const { data: releases } = await supabase
    .from("releases")
    .select("id, code, target_date, status")
    .in("product_id", productIds)
    .order("target_date");
  const { data: items } = await supabase
    .from("roadmap_items")
    .select("ref, title, status, quarter, release_id")
    .in("product_id", productIds);

  const columns: RoadmapColumn[] = [];
  const activeReleases = (releases ?? []).filter((r) => r.status !== "shipped").slice(0, 2);
  for (const [i, rel] of activeReleases.entries()) {
    columns.push({
      label: i === 0 ? `Now, ${rel.code}` : `Next, ${rel.code}`,
      releaseCode: rel.code,
      items: (items ?? [])
        .filter((it) => it.release_id === rel.id)
        .map((it) => ({ ref: it.ref, title: it.title, note: null })),
    });
  }
  const forecastItems = (items ?? []).filter((it) => !it.release_id);
  if (forecastItems.length) {
    columns.push({
      label: "Later, forecast",
      releaseCode: null,
      items: forecastItems.map((it) => ({ ref: it.ref, title: it.title, note: it.quarter ? `FORECAST, ${it.quarter.toUpperCase()}` : "FORECAST, NO RELEASE" })),
    });
  }
  return columns;
}

export interface FeatureDetail {
  id: string;
  ref: string;
  title: string;
  description: string | null;
  status: string;
  productName: string;
  releaseCode: string | null;
  clientVisible: boolean;
  work: { title: string; assigneeName: string; status: string }[];
}

export async function getFeatureByRef(ref: string): Promise<FeatureDetail | null> {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("roadmap_items")
    .select("id, ref, title, description, status, product_id, release_id, client_visible")
    .ilike("ref", ref)
    .maybeSingle();
  if (!item) return null;

  const [{ data: product }, { data: release }, { data: work }] = await Promise.all([
    supabase.from("products").select("name").eq("id", item.product_id).maybeSingle(),
    item.release_id ? supabase.from("releases").select("code").eq("id", item.release_id).maybeSingle() : Promise.resolve({ data: null as { code: string } | null }),
    supabase.from("engineering_tasks").select("title, status, person_id").eq("roadmap_item_id", item.id),
  ]);

  const personIds = [...new Set((work ?? []).map((w) => w.person_id))];
  const { data: people } = personIds.length
    ? await supabase.from("people").select("id, full_name").in("id", personIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return {
    id: item.id,
    ref: item.ref,
    title: item.title,
    description: item.description,
    status: item.status,
    productName: product?.name ?? "—",
    releaseCode: release?.code ?? null,
    clientVisible: item.client_visible ?? false,
    work: (work ?? []).map((w) => ({ title: w.title, assigneeName: nameById.get(w.person_id) ?? "—", status: w.status })),
  };
}

export interface ReleaseDetail {
  id: string;
  code: string;
  name: string;
  targetDate: string | null;
  readinessPct: number;
  productName: string;
  criteria: { description: string; status: string; metAt: string | null }[];
  featureCount: number;
  dependentProjects: { ref: string; name: string; note: string | null }[];
}

export async function getReleaseByCode(code: string): Promise<ReleaseDetail | null> {
  const supabase = await createClient();
  const { data: release } = await supabase
    .from("releases")
    .select("id, code, name, target_date, readiness_pct, product_id")
    .ilike("code", code)
    .maybeSingle();
  if (!release) return null;

  const [{ data: product }, { data: criteria }, { count: featureCount }, { data: deps }] = await Promise.all([
    supabase.from("products").select("name").eq("id", release.product_id).maybeSingle(),
    supabase.from("release_criteria").select("description, status, met_at").eq("release_id", release.id).order("sequence"),
    supabase.from("roadmap_items").select("id", { count: "exact", head: true }).eq("release_id", release.id),
    supabase.from("project_release_dependencies").select("project_id, note").eq("release_id", release.id),
  ]);

  const depProjectIds = (deps ?? []).map((d) => d.project_id);
  const { data: depProjects } = depProjectIds.length
    ? await supabase.from("projects").select("id, ref, name").in("id", depProjectIds)
    : { data: [] as { id: string; ref: string; name: string }[] };
  const projectById = new Map((depProjects ?? []).map((p) => [p.id, p]));

  return {
    id: release.id,
    code: release.code,
    name: release.name,
    targetDate: release.target_date,
    readinessPct: release.readiness_pct,
    productName: product?.name ?? "—",
    criteria: (criteria ?? []).map((c) => ({ description: c.description, status: c.status, metAt: c.met_at })),
    featureCount: featureCount ?? 0,
    dependentProjects: (deps ?? []).map((d) => ({
      ref: projectById.get(d.project_id)?.ref ?? "",
      name: projectById.get(d.project_id)?.name ?? "",
      note: d.note,
    })),
  };
}

export interface EngineeringLoadRow {
  personId: string;
  personName: string;
  deliveryDays: number;
  productDays: number;
  hypercareDays: number;
  totalDays: number;
}

export async function getEngineeringLoad(workspaceId: string): Promise<EngineeringLoadRow[]> {
  const supabase = await createClient();
  const { data: people } = await supabase.from("people").select("id, full_name").eq("workspace_id", workspaceId).eq("kind", "internal");
  if (!people || people.length === 0) return [];
  const personIds = people.map((p) => p.id);

  const [{ data: deliveryTasks }, { data: engTasks }] = await Promise.all([
    supabase.from("project_tasks").select("assignee_person_id").in("assignee_person_id", personIds).neq("status", "done"),
    supabase.from("engineering_tasks").select("person_id, status").in("person_id", personIds).neq("status", "done"),
  ]);

  const deliveryCount = new Map<string, number>();
  for (const t of deliveryTasks ?? []) {
    if (!t.assignee_person_id) continue;
    deliveryCount.set(t.assignee_person_id, (deliveryCount.get(t.assignee_person_id) ?? 0) + 1);
  }
  const productCount = new Map<string, number>();
  for (const t of engTasks ?? []) productCount.set(t.person_id, (productCount.get(t.person_id) ?? 0) + 1);

  return people
    .map((p) => {
      const del = deliveryCount.get(p.id) ?? 0;
      const prod = productCount.get(p.id) ?? 0;
      return { personId: p.id, personName: p.full_name, deliveryDays: del, productDays: prod, hypercareDays: 0, totalDays: del + prod };
    })
    .filter((r) => r.totalDays > 0)
    .sort((a, b) => b.totalDays - a.totalDays);
}
