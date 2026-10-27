import type { Metadata } from "next";

export const metadata: Metadata = { title: "WhatsApp Scheduler" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
