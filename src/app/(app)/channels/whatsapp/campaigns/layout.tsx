import type { Metadata } from "next";

export const metadata: Metadata = { title: "WhatsApp Campaigns" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
