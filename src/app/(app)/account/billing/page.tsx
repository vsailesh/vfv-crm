"use client";

import { CreditCard } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function Page() {
  return <ComingSoon title="Plan & Billing" blurb="You're on the Free Plan. Usage limits, invoices and upgrade options live here." icon={CreditCard} />;
}
