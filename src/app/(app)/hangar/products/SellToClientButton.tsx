"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { createProject } from "@/app/(app)/missions/projects/actions";

/** The Hangar -> Missions handoff (Decision Pack, "The three handoffs
 * that make it one system": "A market product sold to a client opens a
 * mission, carrying its scope and delivery template"). Reuses
 * createProject exactly as the Missions "Create phase" flow does -- the
 * only difference is the template version is fixed to the product's own
 * (not user-chosen), and the new mission's origin_product_id is set so
 * the link back to the product that sold it is never retyped. */
export function SellToClientButton({
  productId,
  productName,
  templateVersionId,
  clients,
}: {
  productId: string;
  productName: string;
  templateVersionId: string;
  clients: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button variant="secondary" className="flex-none" onClick={() => setOpen(true)}>
        Sell to client
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Sell ${productName} to a client`}>
        <p className="m-0 -mt-1 mb-1 text-[11px] text-muted leading-[1.5]">
          Opens a mission for the chosen client, cloned from this product's own delivery template — the same
          flight plan every sale of {productName} starts from.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            formData.set("templateVersionId", templateVersionId);
            formData.set("originProductId", productId);
            startTransition(async () => {
              try {
                const result = await createProject(formData);
                setOpen(false);
                e.currentTarget?.reset();
                router.push(`/missions/projects/${result.ref.toLowerCase()}`);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create the mission.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="CLIENT">
            <SelectField name="clientId" required placeholder="Select a client" options={clients.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label="REF">
            <input name="ref" required autoFocus className={fieldInputClass} placeholder="NK-M2" />
          </Field>
          <Field label="MISSION NAME">
            <input name="name" required className={fieldInputClass} defaultValue={productName} />
          </Field>

          {clients.length === 0 ? <p className="text-[11.5px] text-block-fg leading-[1.5]">No clients yet — add one first.</p> : null}
          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending || clients.length === 0}>
            {isPending ? "Creating..." : "Create mission"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
