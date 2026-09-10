import { PageHeading, Card, EmptyState } from "@/components/ui/Card";

/** Rendered by a settings-area page in place of its real content when
 * the viewer isn't a workspace_admin. Direct-URL access must be blocked
 * the same way the sidebar hides the nav link for these pages — hiding
 * the link alone doesn't stop someone typing the URL. Kept as a soft
 * empty-state (not a thrown error) so it reads as "not for you" rather
 * than a crash. */
export function AdminOnlyNotice({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeading title={title} />
      <Card>
        <EmptyState title="Workspace admins only." description="This page is part of workspace Settings, visible only to a workspace admin." />
      </Card>
    </div>
  );
}
