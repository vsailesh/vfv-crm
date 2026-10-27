"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, CalendarClock, Inbox as InboxIcon, MessageCircle } from "lucide-react";
import { Badge, Card, SecondaryButton } from "@/components/ui";

type Followup = {
  id: string; title: string; dueAt: string; status: string; customerId: string;
  customerName: string; phone: string;
};

const TABS = ["Pending", "Completed", "Missed", "Cancelled", "All"] as const;
type Focus = "overdue" | "today" | "week" | null;

const DAY = 86400000;

export default function FollowUpsPage() {
  const [rows, setRows] = useState<Followup[]>([]);
  const [counts, setCounts] = useState({ overdue: 0, today: 0, week: 0, all: 0 });
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pending");
  const [focus, setFocus] = useState<Focus>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/followups?status=${tab.toLowerCase()}`);
    const json = await res.json();
    setRows(json.data.data);
    setCounts(json.data.counts);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    await fetch("/api/followups", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }

  const now = Date.now();
  // pending rows: overdue first, then soonest due. Focus filter narrows by bucket.
  const visible = useMemo(() => {
    let list = [...rows];
    if (focus) {
      list = list.filter((f) => {
        if (f.status !== "pending") return false;
        const due = new Date(f.dueAt).getTime();
        if (focus === "overdue") return due < now;
        if (focus === "today") return due >= now && due < now + DAY;
        return due >= now && due < now + 7 * DAY;
      });
    }
    list.sort((a, b) => {
      const ao = a.status === "pending" && new Date(a.dueAt).getTime() < now ? 0 : 1;
      const bo = b.status === "pending" && new Date(b.dueAt).getTime() < now ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
    return list;
  }, [rows, focus, now]);

  const overdueBy = (iso: string) => Math.max(1, Math.ceil((now - new Date(iso).getTime()) / DAY));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Card className="flex flex-wrap items-start justify-between gap-6 p-7">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Follow-up Queue</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Planned touchpoints in one queue — stay on schedule and catch slips early.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SecondaryButton onClick={load}><RefreshCw className="size-4 text-gray-500" /> Refresh Queue</SecondaryButton>
        </div>
      </Card>

      {/* stat cards double as one-tap filters */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {([
          ["overdue", "Overdue", counts.overdue, "text-red-600"],
          ["today", "Today", counts.today, "text-gray-900"],
          ["week", "This Week", counts.week, "text-gray-900"],
          [null, "All Pending", counts.all, "text-gray-900"],
        ] as const).map(([key, label, n, color]) => (
          <button key={label} onClick={() => { setTab("Pending"); setFocus(key); }}
            className={`text-left ${focus === key ? "ring-2 ring-lime" : ""} rounded-2xl`}>
            <Card className="p-5 transition-shadow hover:shadow-md">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
              <p className={`mt-1 text-3xl font-bold ${color}`}>{n}</p>
            </Card>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => { setTab(t); setFocus(null); }}
                className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium ${
                  tab === t ? "border-forest-950 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}>
                {t}
              </button>
            ))}
          </div>
          {focus && (
            <button onClick={() => setFocus(null)}
              className="shrink-0 rounded-full bg-lime px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-forest-950">
              Filter: {focus === "overdue" ? "Overdue" : focus === "today" ? "Today" : "This week"} ×
            </button>
          )}
        </div>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <InboxIcon className="size-10 text-gray-200" />
            <p className="font-semibold text-gray-500">No follow-ups here</p>
            <p className="text-sm text-gray-400">Inbox zero — nothing to chase right now.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map((f) => {
              const isOverdue = f.status === "pending" && new Date(f.dueAt).getTime() < now;
              return (
                <li key={f.id} className={`flex flex-wrap items-center gap-4 px-6 py-4 ${isOverdue ? "bg-red-50/50" : ""}`}>
                  <CalendarClock className={`size-5 shrink-0 ${isOverdue ? "text-red-400" : "text-gray-300"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {f.title}
                      {isOverdue && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
                          Overdue {overdueBy(f.dueAt)}d
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      <Link href={`/crm/customers/${f.customerId}`} className="font-medium hover:underline">{f.customerName}</Link>
                      {" · "}
                      <a href={`https://wa.me/91${f.phone?.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline">
                        <MessageCircle className="size-3 text-emerald-500" /> {f.phone}
                      </a>
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">{new Date(f.dueAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                  <Badge variant={f.status === "completed" ? "active" : f.status === "missed" ? "lost" : "new"}>{f.status}</Badge>
                  {f.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => setStatus(f.id, "completed")} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">Done</button>
                      <button onClick={() => setStatus(f.id, "missed")} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50">Miss</button>
                      <button onClick={() => setStatus(f.id, "cancelled")} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:bg-gray-50">Cancel</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
