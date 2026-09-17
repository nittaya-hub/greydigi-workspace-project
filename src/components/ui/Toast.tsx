"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; message: string; variant: ToastVariant };

const ToastContext = createContext<{ show: (message: string, variant?: ToastVariant) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-3 pointer-events-none sm:items-end sm:right-4 sm:left-auto sm:bottom-4"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={clsx(
              "pointer-events-auto w-full max-w-[360px] rounded-[9px] border px-4 py-3 text-[12.5px] font-medium shadow-lg",
              item.variant === "success" ? "bg-ink text-white border-ink" : "bg-white text-block-fg border-block-fg/30"
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
