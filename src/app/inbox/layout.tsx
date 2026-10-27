import type { Metadata } from "next";

export const metadata: Metadata = { title: "Unified Inbox" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
