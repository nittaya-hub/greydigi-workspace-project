"use client";

import { useState, useTransition } from "react";
import { setPassword } from "./actions";

export function SetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await setPassword(newPassword, confirm);
          setResult(res);
          if (res.ok) {
            setNewPassword("");
            setConfirm("");
          }
        });
      }}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">NEW PASSWORD</span>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="border border-line bg-white rounded-[9px] px-[13px] py-[10px] text-[13px] outline-none focus:border-ink"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">CONFIRM PASSWORD</span>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="border border-line bg-white rounded-[9px] px-[13px] py-[10px] text-[13px] outline-none focus:border-ink"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="bg-ink text-white rounded-[9px] px-[13px] py-[10px] text-[12.5px] font-semibold disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Update password"}
      </button>
      {result ? (
        <p className={`text-[11.5px] leading-[1.5] ${result.ok ? "text-ok-fg" : "text-block-fg"}`}>{result.message}</p>
      ) : null}
    </form>
  );
}
