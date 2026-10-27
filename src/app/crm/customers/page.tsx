"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Download, FileUp, Upload, Plus, Eye, Info } from "lucide-react";
import { Badge, Card, StatPill, SecondaryButton, PrimaryButton } from "@/components/ui";

type Customer = {
  id: string; name: string; phone: string; source: string; leadStage: string | null;
  status: string; assignedStaffName: string | null; tags: string;
  customerNumber: string; city: string | null; state: string | null; updatedAt: string;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [stats, setStats] = useState({ total: 0, whatsapp: 0, activeCount: 0 });
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/customers?limit=50${tab === "archived" ? "&status=archived" : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setRows(json.data.data);
    setStats(json.data.stats);
  }, [tab, q]);

  useEffect(() => { load(); }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Card className="space-y-5 p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">Customer Directory</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              Centralized hub for managing customer profiles, engagement history, and retention pipelines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatPill label="Total Records :" value={stats.total.toLocaleString()} />
            <SecondaryButton><Download className="size-4 text-gray-500" /> Export</SecondaryButton>
            <SecondaryButton><FileUp className="size-4 text-gray-500" /> Template</SecondaryButton>
            <SecondaryButton><Upload className="size-4 text-gray-500" /> Bulk Import</SecondaryButton>
            <PrimaryButton onClick={() => setShowNew(true)}><Plus className="size-4" /> New Customer</PrimaryButton>
          </div>
        </div>

        <div className="flex gap-2">
          {(["active", "archived"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`h-10 rounded-full px-5 text-[11px] font-bold uppercase tracking-wider ${
                tab === t ? "bg-forest-950 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}>
              {t} Contacts
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers by name, phone..."
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
        </div>

        <div className="flex flex-wrap gap-3">
          {["All Segments", "All Tags", "All Sources", "All Pipeline", "All Lifecycle", "All Staff"].map((f) => (
            <button key={f} className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {f}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3 px-6 py-5 text-sm text-gray-600">
          <Info className="mt-0.5 size-4 shrink-0 text-gray-400" />
          <p>Select profiles to perform batch actions. You can select individual rows, the current page, or use Select all (filtered) to target every customer matching your current search and filters.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-gray-200 px-6 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="w-12 px-6 py-4">
                  <input type="checkbox" className="size-5 rounded-md accent-lime"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                </th>
                {["Customer", "Assigned Staff", "Source", "Pipeline", "Lifecycle", "Location", "Last Update", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input type="checkbox" className="size-5 rounded-md accent-lime" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime/25 text-xs font-bold text-forest-950">
                        {r.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{r.name}</span>
                        <span className="block text-sm text-gray-500">+91 {r.phone}</span>
                        <span className="block text-xs text-gray-400">{r.customerNumber}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{r.assignedStaffName ?? "—"}</td>
                  <td className="px-4 py-4"><Badge variant={r.source}>{r.source}</Badge></td>
                  <td className="px-4 py-4">{r.leadStage ? <Badge variant={r.leadStage}>{r.leadStage.replace("_", " ")}</Badge> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-4"><Badge variant={r.status}>{r.status}</Badge></td>
                  <td className="px-4 py-4 text-sm text-gray-600">{r.city ? `${r.city}${r.state ? ", " + r.state : ""}` : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{new Date(r.updatedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</td>
                  <td className="px-4 py-4">
                    <Link href={`/crm/customers/${r.id}`} aria-label={`View ${r.name}`}
                      className="grid size-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                      <Eye className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showNew && <NewCustomerModal onClose={() => setShowNew(false)} onCreated={load} />}
    </div>
  );
}

function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", businessName: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.name || !form.phone) return;
    setBusy(true);
    await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add New Customer</h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-700">×</button>
        </div>
        <div className="space-y-3 text-sm">
          {([["name", "Name *", "Name"], ["phone", "Phone *", "9876543210"], ["email", "Email", "email@example.com"]] as const).map(([k, label, ph]) => (
            <div key={k}>
              <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
              <input value={form[k]} onChange={set(k)} placeholder={ph}
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Address</label>
            <textarea value={form.address} onChange={set("address")} placeholder="Street address, landmark..." rows={2}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([["city", "City"], ["state", "State"]] as const).map(([k, label]) => (
              <div key={k}>
                <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
                <input value={form[k]} onChange={set(k)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
              </div>
            ))}
          </div>
          {([["pincode", "Pincode"], ["businessName", "Business Name"]] as const).map(([k, label]) => (
            <div key={k}>
              <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
              <input value={form[k]} onChange={set(k)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={busy} className="h-10 flex-1 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
