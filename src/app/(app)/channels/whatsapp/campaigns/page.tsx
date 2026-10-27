"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Download } from "lucide-react";
import { Card, PrimaryButton } from "@/components/ui";

type Analytics = {
  totals: {
    launches: number; audience: number; sent: number; delivered: number; read: number;
    clicked: number; replied: number; failed: number; blocked: number; skipped: number;
    conversions: number; totalCost: number; templatesActive: number;
  };
  rates: { delivery: number; read: number; reply: number; click: number; failure: number; costPerDelivery: number; costPerClick: number };
  funnel: Array<{ step: string; n: number; pct: number | null }>;
  daily: Array<{ date: string; sent: number; delivered: number; read: number }>;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function WaCampaignsPage() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 90 * 86400000)));
  const [to, setTo] = useState(iso(new Date()));
  const [data, setData] = useState<Analytics | null>(null);
  const [spinning, setSpinning] = useState(false);

  const load = useCallback(async () => {
    setSpinning(true);
    const json = await fetch(`/api/wa/analytics?from=${from}&to=${to}`).then((r) => r.json());
    setData(json.data);
    setTimeout(() => setSpinning(false), 500);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    if (!data) return;
    const lines = [
      "metric,value",
      ...Object.entries(data.totals).map(([k, v]) => `${k},${v}`),
      ...Object.entries(data.rates).map(([k, v]) => `rate_${k},${v}`),
      ...data.daily.map((d) => `daily_${d.date},${d.sent},${d.delivered},${d.read}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wa-campaigns-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const t = data?.totals;
  const r = data?.rates;
  const maxDaily = data ? Math.max(...data.daily.map((d) => d.sent), 1) : 1;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">Analytics across all templates and launches</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="h-11 rounded-2xl border border-gray-200 bg-white px-3.5 text-sm outline-none focus:ring-2 focus:ring-lime" />
          <span className="text-gray-400">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="h-11 rounded-2xl border border-gray-200 bg-white px-3.5 text-sm outline-none focus:ring-2 focus:ring-lime" />
          <button onClick={load} aria-label="Refresh"
            className="grid size-11 place-items-center rounded-2xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800">
            <RefreshCw className={`size-4 ${spinning ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {t && r && (
        <>
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Campaign performance</h2>
              <button onClick={exportCsv} className="flex h-9 items-center gap-2 rounded-xl border border-gray-200 px-4 text-xs font-semibold hover:bg-gray-50">
                <Download className="size-3.5" /> Export summary CSV
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
              <Stat label="Total launches" value={t.launches} />
              <Stat label="Recipients" value={t.audience.toLocaleString("en-IN")} />
              <Stat label="Delivery rate" value={`${r.delivery}%`} sub={`${t.delivered.toLocaleString("en-IN")} of ${t.audience.toLocaleString("en-IN")} contacts`} />
              <Stat label="Read rate" value={`${r.read}%`} sub={`${t.read.toLocaleString("en-IN")} contacts`} />
              <Stat label="Reply rate" value={`${r.reply}%`} />
              <Stat label="Click rate" value={`${r.click}%`} sub={`${t.clicked} clicked`} />
              <Stat label="Conversions" value={t.conversions} sub="0.0% of audience" />
              <Stat label="Total cost" value={`₹${t.totalCost.toLocaleString("en-IN")}`} sub={`₹${r.costPerDelivery} / delivery`} />
              <Stat label="Templates active" value={t.templatesActive} />
              <Stat label="Failed" value={t.failed} sub={`${r.failure}% failure rate`} warn />
              <Stat label="Blocked" value={t.blocked} />
              <Stat label="Skipped" value={t.skipped} sub="Excluded before sending" />
              <Stat label="Cost / click" value={`₹${r.costPerClick}`} sub="Where clicks exist" />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="text-lg font-bold">Delivery funnel</h2>
              <p className="mt-1 text-xs text-gray-400">Audience → Conversion · % is step-over-step</p>
              <div className="mt-5 space-y-3">
                {data!.funnel.map((f, i) => (
                  <div key={f.step}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-700">{f.step}</span>
                      <span className="flex items-baseline gap-2">
                        <span className="font-bold">{f.n.toLocaleString("en-IN")}</span>
                        {f.pct !== null && <span className="text-xs text-gray-400">{f.pct}%</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${i === 0 ? "bg-gray-300" : "bg-lime"}`}
                        style={{ width: `${Math.max(2, Math.min(100, (f.n / Math.max(1, data!.funnel[0].n)) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Daily volume</h2>
                  <p className="mt-1 text-xs text-gray-400">Sent / delivered / read over time</p>
                </div>
                <button onClick={exportCsv} className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-[11px] font-bold text-gray-600 hover:bg-gray-50">CSV</button>
              </div>
              <div className="mt-5 flex h-48 items-end gap-1.5">
                {data!.daily.map((d) => (
                  <div key={d.date} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-0.5" title={`${d.date}: ${d.sent} sent · ${d.delivered} delivered`}>
                    <div className="w-full rounded-t-sm bg-lime/40" style={{ height: `${(d.delivered / maxDaily) * 100}%` }} />
                    <div className="w-full rounded-b-sm bg-forest-950/80" style={{ height: `${((d.sent - d.delivered) / maxDaily) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-forest-950/80" /> sent</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-lime/40" /> delivered / read</span>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${warn ? "text-amber-600" : ""}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}
