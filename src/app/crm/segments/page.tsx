"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ArrowDownWideNarrow, ChevronRight, Megaphone } from "lucide-react";
import { Card, StatPill, SecondaryButton, PrimaryButton } from "@/components/ui";

type Segment = {
  id: string; name: string; type: string; description: string | null;
  customerIds: string[]; count: number; updatedAt: string;
  customers?: Array<{ id: string; name: string; phone: string }>;
};

export default function SegmentsPage() {
  const [rows, setRows] = useState<Segment[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/segments");
    const json = await res.json();
    setRows(json.data.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleDetails(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    const seg = rows.find((r) => r.id === id);
    if (seg && !seg.customers && seg.customerIds.length > 0) {
      const json = await fetch(`/api/customers?limit=100`).then((r) => r.json());
      const byId = new Map(json.data.data.map((c: any) => [c.id, c]));
      seg.customers = seg.customerIds.map((cid) => byId.get(cid) as { id: string; name: string; phone: string } | undefined).filter((x): x is { id: string; name: string; phone: string } => Boolean(x));
      setRows([...rows]);
    }
    setExpanded(id);
  }

  async function create() {
    if (!name.trim()) return;
    await fetch("/api/segments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setName("");
    setShowNew(false);
    load();
  }

  const totalAudience = rows.reduce((a, r) => a + r.count, 0);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Card className="flex flex-wrap items-start justify-between gap-6 p-7">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Customer Segments</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Build audience segments for targeted WhatsApp campaigns and sharper outreach.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatPill label="Total Segments" value={rows.length} />
          <SecondaryButton><ArrowDownWideNarrow className="size-4 text-gray-500" /> Newest First</SecondaryButton>
          <PrimaryButton onClick={() => setShowNew(true)}><Plus className="size-4" /> New Group</PrimaryButton>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Groups</p>
          <p className="mt-1 text-3xl font-bold">{rows.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Segmented Audience</p>
          <p className="mt-1 text-3xl font-bold">{totalAudience}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((s) => (
          <Card key={s.id} className="flex flex-col p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {s.type === "static" ? "Manual List" : "Dynamic List"}
            </p>
            <h3 className="mt-1 text-lg font-bold">{s.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{s.description ?? "No description provided."}</p>
            <div className="mt-4 space-y-1 text-xs text-gray-400">
              <p><span className="font-bold text-gray-900">{s.count}</span> AUDIENCE</p>
              <p>LAST UPDATED {new Date(s.updatedAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" }).toUpperCase()}</p>
            </div>
            {expanded === s.id && s.customers && (
              <ul className="mt-4 space-y-1.5 rounded-xl bg-gray-50 p-3">
                {s.customers.length === 0 && <li className="text-xs text-gray-400">No customers in this segment yet.</li>}
                {s.customers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{c.name}</span>
                    <span className="text-gray-400">+91 {c.phone}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex gap-2">
              <button onClick={() => toggleDetails(s.id)} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl border border-gray-200 text-xs font-semibold hover:bg-gray-50">
                {expanded === s.id ? "Hide Details" : "View Details"}
                <ChevronRight className={`size-3 transition-transform ${expanded === s.id ? "rotate-90" : ""}`} />
              </button>
              <button className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-forest-950 text-xs font-semibold text-white hover:opacity-90" title="Campaign builder is not wired up yet">
                <Megaphone className="size-3" /> Campaign
              </button>
            </div>
          </Card>
        ))}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">New Group</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Segment name" autoFocus
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowNew(false)} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={create} className="h-10 flex-1 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
