import type { ReactNode } from "react";
import { ShellChrome } from "@/components/shell/ShellChrome";
import { getShellData } from "@/lib/data/shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const shell = await getShellData();

  return <ShellChrome shell={shell}>{children}</ShellChrome>;
}
