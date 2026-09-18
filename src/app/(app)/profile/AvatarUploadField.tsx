"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  // Shows the picked file immediately (a local object URL), rather than
  // waiting on the upload -> record -> revalidate -> re-render round
  // trip to reach this component's own `avatarUrl` prop -- that path is
  // real and does work, but it's a few hops away, and a photo picker
  // that visibly updates the instant you pick a file is worth the
  // small bit of local state. Cleared once the server's own avatarUrl
  // prop reflects the same change, so this never drifts from what's
  // actually saved.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl ?? avatarUrl;

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="w-16 h-16">
        {displayUrl ? <AvatarImage src={displayUrl} alt="" /> : null}
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
            const localUrl = URL.createObjectURL(file);
            setPreviewUrl(localUrl);
            startTransition(async () => {
              try {
                const supabase = createBrowserClient();
                const ext = file.name.split(".").pop() ?? "jpg";
                const path = `${personId}/${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
                if (uploadError) throw new Error(uploadError.message);
                await updateOwnAvatar(path);
                router.refresh();
                toast.show("Photo updated.", "success");
              } catch (err) {
                setPreviewUrl(null);
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
          {displayUrl ? (
            <Button
              variant="secondary"
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await removeOwnAvatar();
                    setPreviewUrl(null);
                    router.refresh();
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
