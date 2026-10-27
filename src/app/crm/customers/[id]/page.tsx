import { Suspense } from "react";
import type { Metadata } from "next";
import db from "@/lib/db";
import CustomerDetail from "./detail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = db.prepare("SELECT name FROM customers WHERE id = ?").get(id) as { name: string } | undefined;
  return { title: row?.name ?? "Customer" };
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading…</div>}>
      <ResolvedDetail params={params} />
    </Suspense>
  );
}

async function ResolvedDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetail id={id} />;
}
