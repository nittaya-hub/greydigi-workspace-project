"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 200 * 1024; // ~200KB -- a logo, not a photo; matches the server-side cap in actions.ts

/** Reads a picked image straight into a data URI on the client and
 * hands it to the form as a hidden field -- no Storage bucket, no
 * signed URL to expire on a canvas that renders many of these at
 * once. Keeps whatever the row already had until a new file is
 * picked or "Remove" is pressed, so re-submitting the surrounding
 * form (e.g. after editing the label) never silently drops a logo
 * that wasn't touched. */
export function LogoUploadField({ name, initialValue }: { name: string; initialValue: string | null }) {
  const [value, setValue] = useState(initialValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setError(null);
          if (file.size > MAX_BYTES) {
            setError("Keep the logo under 200KB.");
            if (inputRef.current) inputRef.current.value = "";
            return;
          }
          const reader = new FileReader();
          reader.onload = () => setValue(typeof reader.result === "string" ? reader.result : "");
          reader.readAsDataURL(file);
        }}
      />
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URI preview, next/image has nothing to optimize here
        <img src={value} alt="" className="w-8 h-8 rounded-[6px] border border-line object-contain bg-white flex-none" />
      ) : (
        <span className="w-8 h-8 rounded-[6px] border border-dashed border-line-soft flex-none" />
      )}
      <button type="button" onClick={() => inputRef.current?.click()} className="text-[10.5px] text-coral hover:underline">
        {value ? "Change logo" : "Upload logo"}
      </button>
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            setError(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="text-[10.5px] text-muted-2 hover:text-coral-strong"
        >
          Remove
        </button>
      ) : null}
      {error ? <span className="text-[10px] text-block-fg">{error}</span> : null}
    </div>
  );
}
