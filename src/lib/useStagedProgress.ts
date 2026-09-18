"use client";

import { useRef, useState } from "react";

/** Drives a percentage bar for a multi-step upload/import flow when no
 * step reports real byte-level progress (the Supabase storage client
 * doesn't expose one) -- each stage eases toward its own target percent
 * while its real promise is in flight, then snaps to that target the
 * moment the promise actually resolves. Never claims more progress than
 * is true; just avoids a flat 0% while real work is happening. */
export function useStagedProgress() {
  const [percent, setPercent] = useState(0);
  const timerRef = useRef<number | null>(null);

  function clear() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function stage<T>(promise: Promise<T>, targetPercent: number, tickMs = 150): Promise<T> {
    clear();
    timerRef.current = window.setInterval(() => {
      setPercent((p) => (p < targetPercent - 2 ? p + Math.max(1, (targetPercent - p) * 0.12) : p));
    }, tickMs);
    try {
      return await promise;
    } finally {
      clear();
      setPercent(targetPercent);
    }
  }

  function reset() {
    clear();
    setPercent(0);
  }

  return { percent, stage, reset };
}
