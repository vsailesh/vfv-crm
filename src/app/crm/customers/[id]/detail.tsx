"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BellPlus, Pencil, Archive, StickyNote } from "lucide-react";
import { Badge, Card } from "@/components/ui";

type Detail = {
  customer: any; notes: any[]; activities: any[]; followups: any[]; lead: any;
};

const TABS = ["Overview", "Activity", "Follow-ups", "Analytics", "Notes"] as const;

export default function CustomerDetail({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState("");

  const load = () => fetch(`/api/customers/${id}`).then((r) => r.json()).then((j) => setData(j.data));

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (!data) return <div className="p-8 text-sm text-gray-500">Loading…</div>;
  const c = data.customer;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" });

  async function setReminder() {
    const dueAt = new Date(Date.now() + 86400000).toISOString();
    await fetch("/api/followups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: id, title: `Reminder: follow up with ${c.name}`, dueAt }),
    });
    setToast("Reminder scheduled for tomorrow");
    load();
  }

  async function archive() {
    await fetch(`/api/customers/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    setToast("Customer archived");
    load();
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Link href="/crm/customers" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeft className="size-4" /> Back to list
      </Link>

      <Card className="p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-lime/30 text-lg font-bold text-forest-950">
                {c.name?.[0]?.toUpperCase() ?? "?"}
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
                <p className="text-sm text-gray-500">{c.phone}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {c.leadStage && <Badge variant={c.leadStage}>{c.leadStage.replace("_", " ")}</Badge>}
              <Badge variant={c.status}>{c.status}</Badge>
              <span className="text-xs uppercase tracking-wide text-gray-400">Last update {fmt(c.updatedAt)}</span>
              <span className="text-xs uppercase tracking-wide text-gray-400">Engagement {c.engagement}</span>
              <span className="text-xs uppercase tracking-wide text-gray-400">
                Tenure {Math.max(0, Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000))} Days
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={setReminder} className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50">
              <BellPlus className="size-4 text-gray-500" /> Set reminder
            </button>
            <button onClick={() => setShowEdit(true)} className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50">
              <Pencil className="size-4 text-gray-500" /> Edit
            </button>
            <button onClick={archive} disabled={c.status === "archived"} className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50 disabled:opacity-40">
              <Archive className="size-4 text-gray-500" /> {c.status === "archived" ? "Archived" : "Archive"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-gray-100">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
                tab === t ? "border-forest-950 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="pt-6">
          {tab === "Overview" && (
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Contact</p>
                <dl className="space-y-2 text-sm">
                  <Row k="Phone" v={c.phone} />
                  <Row k="Email" v={c.email ?? "—"} />
                  {c.city && <Row k="Location" v={`${c.city}, ${c.state ?? ""} ${c.pincode ?? ""}`} />}
                </dl>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Account</p>
                <dl className="space-y-2 text-sm">
                  <Row k="Customer since" v={fmt(c.createdAt)} />
                  <Row k="Updated" v={fmt(c.updatedAt)} />
                  <Row k="Source" v={c.source.toUpperCase()} />
                  <Row k="Tags" v={c.tags && c.tags !== "[]" ? JSON.parse(c.tags).join(", ") : "—"} />
                  <Row k="Assigned to" v={c.assignedStaffName ?? "—"} />
                </dl>
              </div>
            </div>
          )}

          {tab === "Activity" && (
            <ul className="space-y-3">
              {data.activities.length === 0 && <p className="text-sm text-gray-400">No activity yet.</p>}
              {data.activities.map((a: any) => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1 size-2 rounded-full bg-lime" />
                  <div>
                    <p>{a.text}</p>
                    <p className="text-xs text-gray-400">{fmt(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tab === "Follow-ups" && (
            <ul className="space-y-3">
              {data.followups.length === 0 && <p className="text-sm text-gray-400">No follow-ups scheduled.</p>}
              {data.followups.map((f: any) => (
                <li key={f.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
                  <span>{f.title}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{new Date(f.dueAt).toLocaleString("en-IN")}</span>
                    <Badge variant={f.status === "completed" ? "active" : f.status === "missed" ? "lost" : "new"}>{f.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {tab === "Analytics" && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {([["Engagement", c.engagement], ["Notes", data.notes.length], ["Activities", data.activities.length], ["Follow-ups", data.followups.length]] as const).map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{k}</p>
                  <p className="mt-1 text-2xl font-bold">{v}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "Notes" && (
            <div className="space-y-3">
              {data.notes.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <StickyNote className="size-8 text-gray-300" />
                  <p className="text-sm text-gray-400">No notes yet — add the first one.</p>
                </div>
              )}
              {data.notes.map((n: any) => (
                <div key={n.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
                  <p>{n.body}</p>
                  <p className="mt-2 text-xs text-gray-400">{fmt(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-forest-950 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {showEdit && (
        <EditModal
          customer={c}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); setToast("Customer updated"); load(); }}
        />
      )}
    </div>
  );
}

function EditModal({ customer, onClose, onSaved }: { customer: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: customer.name, phone: customer.phone, email: customer.email ?? "", city: customer.city ?? "", state: customer.state ?? "", businessName: customer.businessName ?? "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    if (!form.name.trim()) return;
    setBusy(true);
    await fetch(`/api/customers/${customer.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Edit Customer</h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-700">×</button>
        </div>
        <div className="space-y-3">
          {([["name", "Name"], ["phone", "Phone"], ["email", "Email"], ["city", "City"], ["state", "State"], ["businessName", "Business Name"]] as const).map(([k, label]) => (
            <div key={k}>
              <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
              <input value={form[k]} onChange={set(k)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={busy} className="h-10 flex-1 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-4">
      <dt className="w-32 shrink-0 text-gray-500">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
