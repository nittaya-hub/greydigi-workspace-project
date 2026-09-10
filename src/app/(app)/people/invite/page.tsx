import { PageHeading, Card } from "@/components/ui/Card";
import { InviteForm } from "./InviteForm";

export default function InviteMemberPage() {
  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[900px] mx-auto">
      <PageHeading
        title="Add a team member"
        description="Creates a sign-in account with email and password. Only a workspace admin can do this."
      />
      <Card className="p-5">
        <InviteForm />
      </Card>
    </div>
  );
}
