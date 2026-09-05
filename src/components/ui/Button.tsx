import { type ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";
import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "coral" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white font-semibold hover:bg-ink-soft",
  secondary: "bg-white text-ink border border-line hover:bg-canvas",
  coral: "bg-coral text-white font-semibold hover:bg-coral-strong",
  ghost: "bg-transparent text-coral border border-line hover:bg-coral-tint",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center rounded-[9px] px-[13px] py-[9px] text-[11.5px] transition-colors disabled:opacity-50 disabled:pointer-events-none",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
});

export function LinkButton({
  href,
  variant = "secondary",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center rounded-[9px] px-[13px] py-[9px] text-[11.5px] font-semibold transition-colors",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
