"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Download, FileUp, Upload, Plus, Eye, Info, MessageCircle } from "lucide-react";
import { STAGES } from "@/lib/stages";
import { Badge, Card, StatPill, SecondaryButton, PrimaryButton } from "@/components/ui";

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: Record<string, string>;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none">
        {Object.entries(options).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

type Customer = {
  id: string; name: string; phone: string; source: string; leadStage: string | null;
  status: string; assignedStaffName: string | null; tags: string;
  customerNumber: string; city: string | null; state: string | null; updatedAt: string;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [stats, setStats] = useState({ total: 0, whatsapp: 0, activeCount: 0 });
  const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ source: "", stage: "", status: "", staff: "" });
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [assignTo, setAssignTo] = useState<string>("");

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ limit: "50", page: String(page) });
    if (tab === "archived") sp.set("status", "archived");
    if (q) sp.set("q", q);
    if (filters.source) sp.set("source", filters.source);
    if (filters.stage) sp.set("stage", filters.stage);
    if (tab === "active" && filters.status) sp.set("status", filters.status);
    if (filters.staff) sp.set("staff", filters.staff);
    const res = await fetch(`/api/customers?${sp}`);
    const json = await res.json();
    setRows(json.data.data);
    setStats(json.data.stats);
    setMeta(json.data.meta);
  }, [tab, q, filters, page]);

  useEffect(() => {
    fetch("/api/staff").then((r) => r.json()).then((j) => setStaffList(j.data.data));
  }, []);

  useEffect(() => { setPage(1); }, [tab, q, filters]);
  useEffect(() => { load(); }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // bulk assign: one PATCH per selected customer
  async function bulkAssign() {
    if (!assignTo) return;
    await Promise.all([...selected].map((id) =>
      fetch(`/api/customers/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedStaffId: assignTo }),
      })));
    setSelected(new Set());
    setAssignTo("");
    load();
  }

  // client-side CSV of the selected rows
  function exportSelected() {
    const picked = rows.filter((r) => selected.has(r.id));
    const head = "Name,Phone,CustomerNumber,Source,Pipeline,Lifecycle,Staff,City,UpdatedAt";
    const csv = [head, ...picked.map((r) =>
      [r.name, r.phone, r.customerNumber, r.source, r.leadStage ?? "", r.status, r.assignedStaffName ?? "", r.city ?? "", r.updatedAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `vfv-customers-${picked.length}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  const archivedCount = Math.max(0, stats.total - stats.activeCount);

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
            <SecondaryButton onClick={exportSelected}><Download className="size-4 text-gray-500" /> Export</SecondaryButton>
            <SecondaryButton><FileUp className="size-4 text-gray-500" /> Template</SecondaryButton>
            <SecondaryButton><Upload className="size-4 text-gray-500" /> Bulk Import</SecondaryButton>
            <PrimaryButton onClick={() => setShowNew(true)}><Plus className="size-4" /> New Customer</PrimaryButton>
          </div>
        </div>

        <div className="flex gap-2">
          {(["active", "archived"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex h-10 items-center gap-2 rounded-full px-5 text-[11px] font-bold uppercase tracking-wider ${
                tab === t ? "bg-forest-950 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}>
              {t} Contacts
              <span className={`rounded-full px-1.5 text-[10px] ${tab === t ? "bg-lime text-forest-950" : "bg-gray-200 text-gray-600"}`}>
                {t === "active" ? stats.activeCount : archivedCount}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers by name, phone..."
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
        </div>

        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Source" value={filters.source} onChange={(v) => setFilters({ ...filters, source: v })}
            options={{ "": "All Sources", website: "Website", whatsapp: "WhatsApp", manual: "Manual", qr: "QR" }} />
          <FilterSelect label="Pipeline" value={filters.stage} onChange={(v) => setFilters({ ...filters, stage: v })}
            options={{ "": "All Pipeline", ...Object.fromEntries(STAGES.map((s) => [s.key, s.label])) }} />
          {tab === "active" && (
            <FilterSelect label="Lifecycle" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })}
              options={{ "": "All Lifecycle", prospect: "Prospect", active: "Active" }} />
          )}
          <FilterSelect label="Staff" value={filters.staff} onChange={(v) => setFilters({ ...filters, staff: v })}
            options={{ "": "All Staff", ...Object.fromEntries(staffList.map((s) => [s.id, s.name])) }} />
        </div>
      </Card>

      <Card>
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-lime/10 px-6 py-4">
            <p className="text-sm font-bold">{selected.size} selected</p>
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none">
              <option value="">Assign to staff…</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={bulkAssign} disabled={!assignTo}
              className="h-9 rounded-xl bg-forest-950 px-4 text-xs font-semibold text-white disabled:opacity-40">Apply</button>
            <button onClick={exportSelected}
              className="h-9 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold hover:bg-gray-50">Export CSV</button>
            <button onClick={() => setSelected(new Set())}
              className="ml-auto text-xs font-semibold text-gray-500 hover:text-gray-800">Clear selection</button>
          </div>
        ) : (
          <div className="flex items-start gap-3 px-6 py-5 text-sm text-gray-600">
            <Info className="mt-0.5 size-4 shrink-0 text-gray-400" />
            <p>Select profiles to perform batch actions. You can select individual rows, the current page, or use Select all (filtered) to target every customer matching your current search and filters.</p>
          </div>
        )}
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
                    <div className="flex items-center gap-1">
                      <a href={`https://wa.me/91${r.phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${r.name}`}
                        className="grid size-9 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50">
                        <MessageCircle className="size-4" />
                      </a>
                      <Link href={`/crm/customers/${r.id}`} aria-label={`View ${r.name}`}
                        className="grid size-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                        <Eye className="size-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-500">
          <p>Showing {from}–{to} of {meta.total.toLocaleString()}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page <= 1}
              className="h-9 rounded-xl border border-gray-200 px-4 text-xs font-semibold disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <span className="text-xs font-semibold">Page {meta.page} / {meta.pages}</span>
            <button onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={meta.page >= meta.pages}
              className="h-9 rounded-xl border border-gray-200 px-4 text-xs font-semibold disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      </Card>

      {showNew && <NewCustomerModal onClose={() => setShowNew(false)} onCreated={load} />}
    </div>
  );
}

function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", businessName: "" });
  const [busy, setBusy] = useState(false);
  const [dupeWarn, setDupeWarn] = useState<{ id: string; name: string; phone: string } | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.name || !form.phone) return;
    setBusy(true);
    const res = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (res.status === 409 && json?.data?.existing) { setDupeWarn(json.data.existing); return; }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {dupeWarn && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span>Phone already on file: <strong>{dupeWarn.name}</strong> ({dupeWarn.phone}).</span>
            <Link href={`/crm/customers/${dupeWarn.id}`} onClick={onClose} className="font-bold underline">Open that record</Link>
            <span className="text-amber-600">— or change the phone to save a new one.</span>
          </div>
        )}
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
