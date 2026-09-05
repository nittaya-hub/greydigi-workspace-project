"use client";

import { useState, useTransition } from "react";
import { sendMagicLink, signInWithPassword, signInWithGoogle } from "./actions";

export function SignInForm({ redirectPath }: { redirectPath: string }) {
  const [mode, setMode] = useState<"link" | "password">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        disabled={isGooglePending}
        onClick={() => {
          startGoogleTransition(async () => {
            const res = await signInWithGoogle(redirectPath);
            if (res.url) {
              window.location.href = res.url;
            } else {
              setResult(res);
            }
          });
        }}
        className="flex items-center justify-center gap-2 border border-line bg-white rounded-[9px] px-[13px] py-[10px] text-[12.5px] font-semibold text-ink disabled:opacity-50"
      >
        <GoogleIcon />
        {isGooglePending ? "Redirecting..." : "Continue with Google"}
      </button>

      <div className="flex items-center gap-2.5 text-[10.5px] text-muted">
        <span className="flex-1 h-px bg-line" />
        or
        <span className="flex-1 h-px bg-line" />
      </div>

      <div className="flex gap-0.5 border-b border-line">
        <button
          type="button"
          onClick={() => {
            setMode("password");
            setResult(null);
          }}
          className={`px-3 py-[9px] text-[12px] border-b-2 -mb-px ${
            mode === "password" ? "font-semibold text-ink border-coral" : "text-muted border-transparent"
          }`}
        >
          Email &amp; password
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("link");
            setResult(null);
          }}
          className={`px-3 py-[9px] text-[12px] border-b-2 -mb-px ${
            mode === "link" ? "font-semibold text-ink border-coral" : "text-muted border-transparent"
          }`}
        >
          Magic link
        </button>
      </div>

      {mode === "password" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await signInWithPassword(email, password, redirectPath);
              // Only reached on failure — success redirects away.
              if (res) setResult(res);
            });
          }}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[.09em] text-muted">EMAIL</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@greydigi.com"
              className="border border-line bg-white rounded-[9px] px-[13px] py-[10px] text-[13px] outline-none focus:border-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[.09em] text-muted">PASSWORD</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border border-line bg-white rounded-[9px] px-[13px] py-[10px] text-[13px] outline-none focus:border-ink"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="bg-ink text-white rounded-[9px] px-[13px] py-[10px] text-[12.5px] font-semibold disabled:opacity-50"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await sendMagicLink(email, redirectPath);
              setResult(res);
            });
          }}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[.09em] text-muted">EMAIL</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@greydigi.com"
              className="border border-line bg-white rounded-[9px] px-[13px] py-[10px] text-[13px] outline-none focus:border-ink"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="bg-ink text-white rounded-[9px] px-[13px] py-[10px] text-[12.5px] font-semibold disabled:opacity-50"
          >
            {isPending ? "Sending..." : "Send sign-in link"}
          </button>
        </form>
      )}

      {result ? (
        <p className={`text-[11.5px] leading-[1.5] ${result.ok ? "text-ok-fg" : "text-block-fg"}`}>{result.message}</p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.87 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
