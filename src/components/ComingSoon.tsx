"use client";

import { usePathname } from "next/navigation";
import { Card, EmptyState } from "@/components/ui";
import type { LucideIcon } from "lucide-react";

/** Shared placeholder for surfaces captured from the reference app but not yet rebuilt. */
export default function ComingSoon({ title, blurb, icon: Icon }: { title: string; blurb: string; icon: LucideIcon }) {
  const path = usePathname();
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Card className="p-7">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">{blurb}</p>
        </div>
      </Card>
      <Card className="p-6">
        <EmptyState
          icon={<Icon className="size-10" />}
          title="Not wired up yet"
          hint={`Route ${path} is a placeholder — the data model and API for this surface aren't built.`}
        />
      </Card>
    </div>
  );
}
