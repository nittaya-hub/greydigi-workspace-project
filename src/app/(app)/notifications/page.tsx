import { PageHeading } from "@/components/ui/Card";
import { listNotifications } from "@/lib/data/admin";
import { MarkAllReadButton } from "./MarkAllReadButton";
import { NotificationsBoard } from "./NotificationsBoard";

export default async function NotificationsPage() {
  const notifications = await listNotifications();

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading
          title="Notifications"
          description="Action needed first, then things that changed. Click a row to open it and read; archive it separately when you're done."
        />
        <MarkAllReadButton />
      </div>

      <NotificationsBoard notifications={notifications} />
    </div>
  );
}
