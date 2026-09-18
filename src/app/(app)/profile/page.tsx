import { notFound } from "next/navigation";
import { PageHeading, Card, CardHeader } from "@/components/ui/Card";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { updateOwnProfile } from "./actions";
import { AvatarUploadField } from "./AvatarUploadField";

export default async function ProfilePage() {
  const person = await getCurrentPerson();
  if (!person) notFound();

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[720px] mx-auto">
      <PageHeading title="Profile" description="Your own name and photo -- visible to your whole workspace, wherever your name shows up (task owners, assignee pickers, comments)." />

      <Card>
        <CardHeader title="Photo" />
        <div className="px-4 py-4">
          <AvatarUploadField personId={person.id} initials={person.avatar_initials} avatarUrl={person.avatar_url} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Name" />
        <form action={updateOwnProfile} className="px-4 py-4 flex flex-col gap-3 max-w-[420px]">
          <Field label="FULL NAME">
            <input name="full_name" required defaultValue={person.full_name} className={fieldInputClass} />
          </Field>
          <Field label="EMAIL">
            <input value={person.email} disabled className={`${fieldInputClass} opacity-60`} />
          </Field>
          <p className="m-0 text-[10.5px] text-muted-2">Email is tied to your sign-in and can&apos;t be changed here.</p>
          <Button variant="primary" type="submit" className="self-start">
            Save
          </Button>
        </form>
      </Card>
    </div>
  );
}
