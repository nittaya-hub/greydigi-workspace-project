import Image from "next/image";
import { SetPasswordForm } from "./SetPasswordForm";

export default function SetPasswordPage() {
  return (
    <div className="min-h-dvh bg-canvas flex items-center justify-center px-4">
      <div className="bg-white border border-line rounded-[12px] max-w-[380px] w-full p-7 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Image src="/greydigi-logo.png" alt="greydigi" width={26} height={26} className="rounded-[6px]" />
          <span className="font-display font-extrabold text-[16px]">greydigi</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
          <h1 className="m-0 font-display font-extrabold text-[18px] text-ink">Set your password</h1>
          <p className="m-0 text-[12px] text-muted">
            Choose a password you&apos;ll use to sign in from now on.
          </p>
        </div>
        <SetPasswordForm />
      </div>
    </div>
  );
}
