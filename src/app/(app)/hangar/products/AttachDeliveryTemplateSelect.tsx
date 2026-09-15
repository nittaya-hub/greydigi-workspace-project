"use client";

import { useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import { setProductDeliveryTemplate } from "./actions";
import type { TemplateVersionOption } from "@/lib/data/product";

/** Attaches the delivery template on a product created before this field
 * existed. Once set, "Sell to client" (SellToClientButton) appears in
 * its place — a product only gets one or the other shown at a time. */
export function AttachDeliveryTemplateSelect({ productId, templateOptions }: { productId: string; templateOptions: TemplateVersionOption[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = String(new FormData(e.currentTarget).get("deliveryTemplateVersionId") ?? "");
        startTransition(async () => {
          await setProductDeliveryTemplate(productId, value || null);
        });
      }}
      className="flex items-center gap-1.5"
    >
      <SelectField
        name="deliveryTemplateVersionId"
        defaultValue=""
        disabled={isPending}
        placeholder="Not a market product"
        className="w-[180px]"
        options={[{ value: "", label: "Not a market product" }, ...templateOptions.map((t) => ({ value: t.id, label: t.label }))]}
      />
      <Button type="submit" variant="secondary" disabled={isPending}>
        Attach
      </Button>
    </form>
  );
}
