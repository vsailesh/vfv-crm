"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Send, X, Clock, Repeat2 } from "lucide-react";
import { Card } from "@/components/ui";

type Cmp = {
  id: string; name: string; template: string; status: string;
  recipientCount: number; scheduledAt: string | null; createdAt: string;
  segmentName: string | null;
};

export default function WaSchedulerPage() {
  const [rows, setRows] = useState<Cmp[]>([]);
  const [spinning, setSpinning] = useState(false);

  const load = useCallback(async () => {
    setSpinning(true);
    const json = await fetch("/api/campaigns").then((r) => r.json());
    setRows(json.data.data.filter((c: Cmp) => c.status === "queued"));
    setTimeout(() => setSpinning(false), 500);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function launch(id: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    load();
  }

  async function cancel(id: string) {
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    load();
  }

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Scheduler</h1>
          <p className="mt-1 text-sm text-gray-500">Everything queued to send. Soonest first — cancel or launch on demand.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-11 items-center rounded-2xl border border-gray-200 bg-white px-4 text-sm">
            <span className="font-bold">{rows.length}</span>
            <span className="ml-1.5 text-gray-400">scheduled {rows.length === 1 ? "send" : "sends"}</span>
          </span>
          <button onClick={load} aria-label="Refresh"
            className="grid size-11 place-items-center rounded-2xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800">
            <RefreshCw className={`size-4 ${spinning ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="grid place-items-center p-14 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-gray-50 text-gray-300">
            <Clock className="size-8" />
          </span>
          <h2 className="mt-5 text-lg font-bold">No upcoming send on the queue</h2>
          <p className="mt-1 text-sm font-medium text-gray-500">No campaigns scheduled</p>
          <p className="mt-2 max-w-sm text-xs text-gray-400">Schedule a send from the campaign builder to see it queued here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-5 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Clock className="size-5" />
              </span>
              <div className="min-w-48 flex-1">
                <p className="font-bold">{c.name}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {c.segmentName ?? "segment"} · {c.recipientCount} recipients
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sends at</p>
                <p className="mt-0.5 text-sm font-semibold">{fmt(c.scheduledAt ?? c.createdAt)}</p>
              </div>
              <p className="hidden max-w-64 truncate text-xs text-gray-400 md:block" title={c.template}>{c.template}</p>
              <div className="ml-auto flex gap-2">
                <button onClick={() => launch(c.id)}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-forest-950 px-4 text-xs font-semibold text-white hover:opacity-90">
                  <Send className="size-3" /> Launch now
                </button>
                <button onClick={() => cancel(c.id)}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-red-100 px-4 text-xs font-semibold text-red-600 hover:bg-red-50">
                  <X className="size-3" /> Cancel
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="flex items-center gap-4 p-5 opacity-90">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-400">
          <Repeat2 className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold">Recurring campaigns</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Daily, weekly and monthly broadcasts will show their next-fire previews here.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-600">Coming soon</span>
      </Card>
    </div>
  );
}
