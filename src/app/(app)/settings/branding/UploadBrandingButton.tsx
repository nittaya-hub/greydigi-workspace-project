"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { uploadWorkspaceBranding } from "./actions";

export function UploadBrandingButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        Upload theme
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload a brand theme">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await uploadWorkspaceBranding(formData);
                setOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not upload the theme.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="THEME PACKAGE (.skill OR .zip)">
            <input name="file" type="file" accept=".skill,.zip" required className={fieldInputClass} />
          </Field>
          <p className="m-0 text-[10.5px] text-muted leading-[1.5]">
            Reads a design-tokens package: <code>assets/tokens.json</code> for colors and fonts, a logo image, and
            an HTML template if one&apos;s bundled. Uploading a new one replaces the current theme entirely.
          </p>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Uploading..." : "Upload theme"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
