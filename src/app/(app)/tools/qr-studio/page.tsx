"use client";

import { QrCode } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function Page() {
  return <ComingSoon title="QR Studio" blurb="Generate scannable codes that drop people straight into a WhatsApp chat." icon={QrCode} />;
}
