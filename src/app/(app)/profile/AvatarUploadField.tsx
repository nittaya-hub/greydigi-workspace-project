"use client";

import { useRef, useTransition } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/shadcn/avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { updateOwnAvatar, removeOwnAvatar } from "./actions";

export function AvatarUploadField({
  personId,
  initials,
  avatarUrl,
}: {
  personId: string;
  initials: string;
  avatarUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="w-16 h-16">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-[18px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            startTransition(async () => {
              try {
                const supabase = createBrowserClient();
                const ext = file.name.split(".").pop() ?? "jpg";
                const path = `${personId}/${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
                if (uploadError) throw new Error(uploadError.message);
                await updateOwnAvatar(path);
                toast.show("Photo updated.", "success");
              } catch (err) {
                toast.show(err instanceof Error ? err.message : "Could not upload photo.", "error");
              } finally {
                if (inputRef.current) inputRef.current.value = "";
              }
            });
          }}
        />
        <div className="flex gap-2">
          <Button variant="secondary" type="button" disabled={isPending} onClick={() => inputRef.current?.click()}>
            {isPending ? "Uploading..." : "Change photo"}
          </Button>
          {avatarUrl ? (
            <Button
              variant="secondary"
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await removeOwnAvatar();
                    toast.show("Photo removed.", "success");
                  } catch (err) {
                    toast.show(err instanceof Error ? err.message : "Could not remove photo.", "error");
                  }
                })
              }
            >
              Remove
            </Button>
          ) : null}
        </div>
        <span className="text-[10.5px] text-muted-2">PNG, JPEG, or WEBP.</span>
      </div>
    </div>
  );
}
