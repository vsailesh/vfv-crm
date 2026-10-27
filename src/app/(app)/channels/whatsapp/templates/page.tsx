"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2, X, Eye, Send, Sparkles } from "lucide-react";
import { Card, PrimaryButton } from "@/components/ui";

type Tpl = {
  id: string; metaTemplateId: string; name: string;
  category: string; status: string; language: string;
  body: string; createdAt: string;
};

const CATS = ["marketing", "utility", "authentication"] as const;

export default function WaTemplatesPage() {
  const [rows, setRows] = useState<Tpl[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [create, setCreate] = useState(false);
  const [view, setView] = useState<Tpl | null>(null);
  const [confirmDel, setConfirmDel] = useState<Tpl | null>(null);

  const load = useCallback(async () => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status !== "all") sp.set("status", status);
    if (category !== "all") sp.set("category", category);
    const json = await fetch(`/api/wa/templates?${sp}`).then((r) => r.json());
    setRows(json.data.data);
  }, [q, status, category]);

  useEffect(() => { load(); }, [load]);

  async function remove() {
    if (!confirmDel) return;
    await fetch(`/api/wa/templates/${confirmDel.id}`, { method: "DELETE" });
    setConfirmDel(null);
    load();
  }

  return (
    <div className="space-y-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">WhatsApp / Templates</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{rows.length} templates across all statuses</h1>
        </div>
        <PrimaryButton onClick={() => setCreate(true)}><Plus className="size-4" /> Create Template</PrimaryButton>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-violet-900">AI Template Intelligence</p>
          <p className="text-xs text-violet-700/80">Analyze your approval rate and get suggestions to improve.</p>
        </div>
        <button className="h-9 shrink-0 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white hover:bg-violet-700">Analyze</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates..."
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-lime" />
        </div>
        <Select value={status} onChange={setStatus} options={[["all", "All Statuses"], ["approved", "Approved"], ["pending", "Pending"], ["rejected", "Rejected"]]} />
        <Select value={category} onChange={setCategory} options={[["all", "All Categories"], ...CATS.map((c) => [c, c[0].toUpperCase() + c.slice(1)] as [string, string])]} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <th className="px-5 py-3.5">Name</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Language</th>
              <th className="px-4 py-3.5">Created</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/60">
                <td className="px-5 py-3.5">
                  <button onClick={() => setView(t)} className="font-semibold text-gray-900 hover:underline">{t.name}</button>
                  <p className="mt-0.5 font-mono text-[11px] text-gray-400">{t.metaTemplateId}</p>
                </td>
                <td className="px-4 py-3.5 capitalize text-gray-600">{t.category}</td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                    t.status === "approved" ? "bg-emerald-50 text-emerald-600"
                    : t.status === "pending" ? "bg-amber-50 text-amber-600"
                    : "bg-red-50 text-red-600"}`}>{t.status}</span>
                </td>
                <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{t.language.toUpperCase()}</td>
                <td className="px-4 py-3.5 text-gray-500">
                  {new Date(t.createdAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-3 text-xs font-semibold">
                    <span className="flex cursor-pointer items-center gap-1 text-gray-500 hover:text-gray-900">
                      <Send className="size-3" /> Send Template
                    </span>
                    <button onClick={() => setView(t)} className="flex items-center gap-1 text-gray-500 hover:text-gray-900">
                      <Eye className="size-3" /> View
                    </button>
                    <button onClick={() => setConfirmDel(t)} aria-label={`Delete ${t.name}`} className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No templates match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* create modal */}
      {create && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4" onClick={() => setCreate(false)}>
          <div className="my-8 w-full max-w-md rounded-3xl bg-white p-7 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Create Template</h2>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Register with Meta for approval</p>
              </div>
              <button onClick={() => setCreate(false)} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                <X className="size-4" />
              </button>
            </div>
            <CreateForm onDone={() => { setCreate(false); load(); }} />
          </div>
        </div>
      )}

      {/* view modal */}
      {view && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setView(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{view.name}</h2>
                <p className="mt-1 font-mono text-xs text-gray-400">{view.metaTemplateId}</p>
              </div>
              <button onClick={() => setView(null)} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold uppercase text-gray-600 capitalize">{view.category}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                view.status === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{view.status}</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-gray-600">{view.language.toUpperCase()}</span>
            </div>
            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Body</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{view.body}</p>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Created {new Date(view.createdAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      )}

      {/* delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setConfirmDel(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Delete “{confirmDel.name}”?</h2>
            <p className="mt-2 text-sm text-gray-500">Campaigns using this template stop being sendable. Meta-side deletion is permanent.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={remove} className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("marketing");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    const res = await fetch("/api/wa/templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, body }),
    });
    setBusy(false);
    if (res.ok) onDone();
    else setErr((await res.json().catch(() => ({}))).message ?? "Create failed");
  }

  return (
    <div className="mt-5 space-y-4">
      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Template name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. diwali_offer" autoFocus
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Category</label>
        <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold capitalize transition-colors ${
                category === c ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Body</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4}
          placeholder="Namaste {{1}}, here's this week's offer..."
          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
        <p className="mt-1 text-[11px] text-gray-400">Use <code className="rounded bg-gray-100 px-1 font-mono">{"{{1}}"}</code> for variables. Submitted as <span className="font-semibold">pending</span> until Meta approves.</p>
      </div>
      {err && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{err}</p>}
      <div className="flex gap-3">
        <button onClick={onDone} className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Discard</button>
        <button onClick={submit} disabled={!name.trim() || !body.trim() || busy}
          className="h-11 flex-1 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">
          {busy ? "Submitting…" : "Submit for approval"}
        </button>
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-lime">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
