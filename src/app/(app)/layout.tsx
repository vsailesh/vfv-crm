import type { ReactNode } from "react";
import Shell from "@/components/Shell";
import Shortcuts from "@/components/Shortcuts";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Shell>{children}</Shell>
      <Shortcuts />
    </>
  );
}
