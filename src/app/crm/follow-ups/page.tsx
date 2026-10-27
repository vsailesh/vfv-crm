"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, CalendarClock, Inbox as InboxIcon } from "lucide-react";
import { Badge, Card, StatPill, SecondaryButton } from "@/components/ui";

type Followup = {
  id: string; title: string; dueAt: string; status: string;
  customerName: string; phone: string;
};

const TABS = ["Pending", "Completed", "Missed", "Cancelled", "All"] as const;

export default function FollowUpsPage() {
  const [rows, setRows] = useState<Followup[]>([]);
  const [counts, setCounts] = useState({ overdue: 0, today: 0, week: 0, all: 0 });
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pending");

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
          <StatPill label="Active Tasks" value={counts.all} />
          <SecondaryButton onClick={load}><RefreshCw className="size-4 text-gray-500" /> Refresh Queue</SecondaryButton>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {([["Overdue", counts.overdue, "text-red-600"], ["Today", counts.today, "text-gray-900"], ["This Week", counts.week, "text-gray-900"], ["All Pending", counts.all, "text-gray-900"]] as const).map(([label, n, color]) => (
          <Card key={label} className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${color}`}>{n}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex gap-1 border-b border-gray-100 px-6">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium ${
                tab === t ? "border-forest-950 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              {t}
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <InboxIcon className="size-10 text-gray-200" />
            <p className="font-semibold text-gray-500">No follow-ups here</p>
            <p className="text-sm text-gray-400">Inbox zero — nothing to chase right now.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <CalendarClock className="size-5 text-gray-300" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-gray-500">{f.customerName} · {f.phone}</p>
                </div>
                <span className="text-sm text-gray-500">{new Date(f.dueAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                <Badge variant={f.status === "completed" ? "active" : f.status === "missed" ? "lost" : "new"}>{f.status}</Badge>
                {f.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => setStatus(f.id, "completed")} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">Done</button>
                    <button onClick={() => setStatus(f.id, "missed")} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50">Miss</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
