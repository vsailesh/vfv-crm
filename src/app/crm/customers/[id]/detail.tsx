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

  useEffect(() => {
    fetch(`/api/customers/${id}`).then((r) => r.json()).then((j) => setData(j.data));
  }, [id]);

  if (!data) return <div className="p-8 text-sm text-gray-500">Loading…</div>;
  const c = data.customer;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" });

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
            <button className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50">
              <BellPlus className="size-4 text-gray-500" /> Set reminder
            </button>
            <button className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50">
              <Pencil className="size-4 text-gray-500" /> Edit
            </button>
            <button className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50">
              <Archive className="size-4 text-gray-500" /> Archive
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
