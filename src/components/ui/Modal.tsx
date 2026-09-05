"use client";

import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

/** Shared dialog primitive for every "New X" / confirm-action flow.
 * Controlled from the caller (open/onClose) so each feature keeps its own
 * form state; this only owns the overlay, Escape-to-close, and framing. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className="relative bg-white border border-line rounded-[12px] w-full max-w-[480px] max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-line sticky top-0 bg-white">
          <span className="font-display font-extrabold text-[13.5px] text-ink">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex-none flex items-center justify-center rounded-[7px] text-muted hover:bg-canvas hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/** Shared labeled field wrapper for modal forms — same look as InviteForm's. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[9px] tracking-[.09em] text-muted">{label}</span>
      {children}
    </label>
  );
}

export const fieldInputClass = "border border-line bg-white rounded-[9px] px-[11px] py-[9px] text-[12.5px] w-full";
