import Link from "next/link";
import clsx from "clsx";

export function Tabs({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-0.5 border-b border-line">{children}</div>;
}

export function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "px-3 py-[9px] text-[12px] border-b-2 -mb-px transition-colors",
        active ? "font-semibold text-ink border-coral" : "text-muted border-transparent hover:text-ink"
      )}
    >
      {children}
    </Link>
  );
}
