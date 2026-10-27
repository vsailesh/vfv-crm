import type { Metadata } from "next";

export const metadata: Metadata = { title: "QR Studio" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
