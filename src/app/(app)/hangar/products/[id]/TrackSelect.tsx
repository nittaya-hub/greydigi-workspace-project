"use client";

import { useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import { setProductTrack } from "../actions";
import type { ProductTrack } from "@/lib/supabase/database.types";

export function TrackSelect({ productId, track }: { productId: string; track: ProductTrack | null }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = String(new FormData(e.currentTarget).get("track") ?? "");
        startTransition(async () => {
          await setProductTrack(productId, (value || null) as ProductTrack | null);
        });
      }}
      className="flex items-center gap-1.5"
    >
      <SelectField
        name="track"
        defaultValue={track ?? ""}
        disabled={isPending}
        className="w-[180px]"
        placeholder="Not classified"
        options={[
          { value: "", label: "Not classified" },
          { value: "platform", label: "Platform track" },
          { value: "market", label: "Market track" },
        ]}
      />
      <Button type="submit" variant="secondary" disabled={isPending}>
        Set
      </Button>
    </form>
  );
}
