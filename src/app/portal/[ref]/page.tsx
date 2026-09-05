import { notFound } from "next/navigation";
import { ClientPortalView } from "@/components/portal/ClientPortalView";
import { getPortalProject } from "@/lib/data/portal";
import { createClient } from "@/lib/supabase/server";

async function getHypercareEnabled(projectId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).maybeSingle();
  if (!project) return true;
  const { data: client } = await supabase.from("clients").select("hypercare_enabled").eq("id", project.client_id).maybeSingle();
  return client?.hypercare_enabled ?? true;
}

export default async function ClientPortalPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const loaded = await getPortalProject(ref);
  if (!loaded || loaded.result.state !== "ok" || !loaded.result.project) notFound();

  const hypercareEnabled = await getHypercareEnabled(loaded.id);

  return <ClientPortalView result={loaded.result} projectRef={ref} hypercareEnabled={hypercareEnabled} />;
}
