"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/** The debounce-and-autosave primitive behind every inline-editable field
 * in TaskDrawer.tsx — no library, just a ref-held timer. `onChange` waits
 * `delay` ms of inactivity before firing `save`; `saveNow` (used by
 * selects/toggles/dates, which save immediately per the spec) skips the
 * wait entirely. `status` drives the small "Saving…" / "Saved" text next
 * to each field, since there's no explicit Save button to give feedback. */
export function useAutosaveField<T>(initialValue: T, save: (value: T) => Promise<void>, delay = 2000) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<SaveStatus>("idle");
  // Tracks the last `initialValue` we've synced from, so a server-driven
  // prop change (e.g. after revalidatePath refreshes this route) is
  // picked up during render — React's documented pattern for "adjusting
  // state when a prop changes" — without a setState-in-effect roundtrip.
  const [syncedInitialValue, setSyncedInitialValue] = useState(initialValue);
  if (initialValue !== syncedInitialValue && status === "idle") {
    setSyncedInitialValue(initialValue);
    setValue(initialValue);
  }

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (resetRef.current) clearTimeout(resetRef.current);
    },
    []
  );

  const flush = useCallback(async (v: T) => {
    setStatus("saving");
    try {
      await saveRef.current(v);
      setStatus("saved");
      if (resetRef.current) clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }, []);

  const onChange = useCallback(
    (v: T) => {
      setValue(v);
      setStatus("pending");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => flush(v), delay);
    },
    [flush, delay]
  );

  const saveNow = useCallback(
    (v: T) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setValue(v);
      flush(v);
    },
    [flush]
  );

  return { value, status, onChange, saveNow };
}
