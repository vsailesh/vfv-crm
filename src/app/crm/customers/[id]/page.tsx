import { Suspense } from "react";
import CustomerDetail from "./detail";

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
