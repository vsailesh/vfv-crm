import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VFV CRM",
    template: "%s · VFV CRM",
  },
  description: "CRM for Veda For Vaidyas — pipeline, customers, follow-ups, analytics",
  applicationName: "VFV CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`} style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif" }}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
