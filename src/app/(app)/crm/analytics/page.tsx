"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, AlertTriangle, Users, Target, Zap, Activity, Calculator } from "lucide-react";
import { Card, StatPill } from "@/components/ui";

type Overview = {
  range: { preset: string };
  focusToday: Array<{ id: string; tone: string; emoji: string; headline: string; subline: string; ctaLabel: string; ctaPath: string }>;
  overview: {
    totalCustomers: number; activeLeads: number; conversionRate: number;
    avgResponseTimeMinutes: number; retentionScore: number; unassignedCustomers: number; missedFollowUps: number;
  };
  pipeline: { stageDistribution: Array<{ stage: string; count: number; fill: string }>; leakage: Array<{ stage: string; count: number; label: string; minDays: number }> };
  sources: { byChannel: Array<{ channel: string; count: number }> };
  staffPerformance: Array<{ staffId: string; staffName: string; assignedCustomers: number; convertedLeads: number; conversionPct: number; pendingFollowUps: number; missedFollowUps: number }>;
  followUps: { pending: number; completed: number; missed: number; overdue: number };
  retention: { noFollowUpScheduled: number; highEngagement: number };
  activity: { customerActivities: number; notesAdded: number; staffAssignments: number };
  healthScore: number;
  alerts: Array<{ type: string; title: string; urgency?: string; description: string; cause?: string; actionLabel?: string; actionPath?: string }>;
};

type Forecast = {
  pipeline: { byStage: Array<{ stage: string; label: string; fill: string; count: number; value: number; prob: number; weighted: number }>; pipelineValue: number; weightedValue: number };
  won: { month: string; total: number; deals: number };
  quota: { month: string; teamQuota: number; teamAttainmentPct: number; perStaff: Array<{ staffId: string; staffName: string; quota: number; won: number; attainmentPct: number }> };
  trend: Array<{ month: string; label: string; won: number; deals: number }>;
};

const inr = (n: number) => `₹${n >= 100000 ? `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : n >= 1000 ? `${Math.round(n / 1000)}k` : n}`;

const RANGES = ["7d", "30d", "90d"] as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>("30d");

  useEffect(() => {
    fetch(`/api/analytics?range=${range}`).then((r) => r.json()).then((j) => setData(j.data));
    fetch("/api/analytics/forecast").then((r) => r.json()).then((j) => setForecast(j.data));
  }, [range]);

  if (!data) return <div className="p-8 text-sm text-gray-500">Crunching numbers…</div>;

  const totalLeads = data.pipeline.stageDistribution.reduce((a, s) => a + s.count, 0);
  const maxStage = Math.max(1, ...data.pipeline.stageDistribution.map((s) => s.count));
  const maxSrc = Math.max(1, ...data.sources.byChannel.map((s) => s.count));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* header */}
      <Card className="flex flex-wrap items-start justify-between gap-6 p-7">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Operational Intelligence</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            One honest read on pipeline health, team throughput and where revenue is leaking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatPill label="Health Score" value={data.healthScore} />
          <div className="flex rounded-xl bg-gray-100 p-1">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide ${range === r ? "bg-white shadow-sm" : "text-gray-500"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* AI Command Center: focus today */}
      <section className="grid gap-4 md:grid-cols-2">
        {data.focusToday.map((f) => (
          <Card key={f.id} className="flex items-start gap-4 p-6">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime/25 text-2xl">{f.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${f.tone === "warning" ? "text-amber-600" : "text-emerald-600"}`}>
                {f.tone === "warning" ? "Needs attention" : "Opportunity"}
              </p>
              <h3 className="mt-0.5 font-bold">{f.headline}</h3>
              <p className="mt-1 text-sm text-gray-500">{f.subline}</p>
              <Link href={f.ctaPath} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-forest-900 underline decoration-lime decoration-2 underline-offset-4">
                {f.ctaLabel} →
              </Link>
            </div>
          </Card>
        ))}
      </section>

      {/* KPI tiles */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Users className="size-4" />} label="Total Customers" value={data.overview.totalCustomers} sub="all time" />
        <Kpi icon={<Target className="size-4" />} label="Active Leads" value={data.overview.activeLeads} sub="in pipeline now" />
        <Kpi icon={<TrendingUp className="size-4" />} label="Conversion Rate" value={`${data.overview.conversionRate}%`} sub="lead → customer" />
        <Kpi icon={<Zap className="size-4" />} label="Avg Response" value={`${Math.floor(data.overview.avgResponseTimeMinutes / 60)}h ${data.overview.avgResponseTimeMinutes % 60}m`} sub="first reply" />
      </section>

      {/* revenue forecast: weighted pipeline + quota attainment */}
      {forecast && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="p-7">
            <div className="mb-1 flex items-center gap-2">
              <Calculator className="size-5 text-gray-400" />
              <h2 className="text-lg font-bold">Weighted Forecast</h2>
            </div>
            <p className="mb-5 text-xs text-gray-400">Open deals × stage win-probability. What the funnel realistically closes.</p>
            <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Expected revenue</p>
                <p className="text-4xl font-bold text-forest-950">{inr(forecast.pipeline.weightedValue)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Open pipeline</p>
                <p className="text-2xl font-bold text-gray-400">{inr(forecast.pipeline.pipelineValue)}</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="pb-2 pr-3">Stage</th>
                  <th className="pb-2 pr-3 text-right">Deals</th>
                  <th className="pb-2 pr-3 text-right">Value</th>
                  <th className="pb-2 pr-3 text-right">Prob</th>
                  <th className="pb-2 text-right">Weighted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {forecast.pipeline.byStage.filter((s) => s.count > 0).map((s) => (
                  <tr key={s.stage}>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: s.fill }} />
                        <span className="font-medium">{s.label}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{s.count}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-gray-500">{inr(s.value)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-gray-500">{s.prob}%</td>
                    <td className="py-2.5 text-right font-bold tabular-nums">{inr(s.weighted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="space-y-4">
            <Card className="p-7">
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="text-lg font-bold">Quota Attainment — {new Date().toLocaleDateString("en-IN", { month: "long" })}</h2>
                <span className="text-sm text-gray-500">won {inr(forecast.won.total)} / {inr(forecast.quota.teamQuota)} team</span>
              </div>
              <ul className="space-y-4">
                {forecast.quota.perStaff.map((q) => (
                  <li key={q.staffId}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold">{q.staffName}</span>
                      <span className="tabular-nums text-gray-500">{inr(q.won)} / {inr(q.quota)}</span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${q.attainmentPct >= 100 ? "bg-lime" : q.attainmentPct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${Math.min(100, q.attainmentPct)}%` }} />
                    </div>
                    <p className="mt-1 text-right text-xs font-bold tabular-nums text-gray-500">{q.attainmentPct}%{q.attainmentPct > 100 ? " 🎉" : ""}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-7">
              <h2 className="mb-5 text-lg font-bold">Won Revenue — last 5 months</h2>
              <div className="flex h-36 items-end gap-3">
                {forecast.trend.map((t) => {
                  const max = Math.max(1, ...forecast.trend.map((x) => x.won));
                  return (
                    <div key={t.month} className="flex flex-1 flex-col items-center gap-1.5" title={`${t.month}: ${inr(t.won)} (${t.deals} deals)`}>
                      <span className="text-[10px] font-bold tabular-nums text-gray-500">{t.won > 0 ? inr(t.won) : ""}</span>
                      <div className="w-full rounded-t-lg bg-forest-950/85" style={{ height: `${Math.max(t.won > 0 ? 8 : 2, (t.won / max) * 100)}%`, opacity: t.won > 0 ? 1 : 0.15 }} />
                      <span className="text-[11px] font-semibold uppercase text-gray-400">{t.label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </section>
      )}
      <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="flex flex-col items-center justify-center p-8">
          <p className="mb-6 text-[11px] font-bold uppercase tracking-wider text-gray-400">Ops Health Score</p>
          <Gauge value={data.healthScore} />
          <p className="mt-6 max-w-[240px] text-center text-sm leading-relaxed text-gray-500">
            {data.healthScore >= 70 ? "Strong operation. Minor leaks only." : data.healthScore >= 40 ? "Middle of the pack. Fix the red tiles below." : "Fragile pipeline. Act on the alerts now."}
          </p>
        </Card>

        <Card className="p-7">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Pipeline Story</h2>
            <span className="text-sm text-gray-500">{totalLeads} leads across 10 stages</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full">
            {data.pipeline.stageDistribution.filter((s) => s.count > 0).map((s) => (
              <div key={s.stage} style={{ width: `${(s.count / totalLeads) * 100}%`, backgroundColor: s.fill }} title={`${s.stage}: ${s.count}`} />
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {data.pipeline.stageDistribution.map((s) => (
              <div key={s.stage} className="flex items-center gap-3">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.fill }} />
                <span className="w-28 shrink-0 text-sm capitalize text-gray-600">{s.stage.replace("_", " ")}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: `${(s.count / maxStage) * 100}%`, backgroundColor: s.fill }} />
                </div>
                <span className="w-8 text-right text-sm font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* leakage + sources */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-7">
          <div className="mb-5 flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            <h2 className="text-lg font-bold">Pipeline Leakage</h2>
          </div>
          <ul className="space-y-3">
            {data.pipeline.leakage.map((l) => (
              <li key={l.stage} className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm">
                <span className="font-medium text-amber-900">{l.label}</span>
                <span className="font-bold text-amber-700">{l.count > 0 ? "!" : "✓"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-gray-400">Stages stuck past their shelf life. Clear these to stop quiet losses.</p>
        </Card>

        <Card className="p-7">
          <h2 className="mb-5 text-lg font-bold">Where Customers Come From</h2>
          <ul className="space-y-4">
            {data.sources.byChannel.map((s) => (
              <li key={s.channel} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-gray-600">{s.channel}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-lg bg-gray-100">
                  <div className="flex h-full items-center justify-end rounded-lg bg-forest-950 pr-2 text-[10px] font-bold text-lime" style={{ width: `${(s.count / maxSrc) * 100}%` }}>
                    {s.count}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* staff leaderboard */}
      <Card className="p-7">
        <div className="mb-5 flex items-center gap-2">
          <Activity className="size-5 text-gray-400" />
          <h2 className="text-lg font-bold">Staff Leaderboard</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="pb-3 pr-4">Staff</th>
                <th className="pb-3 pr-4">Assigned</th>
                <th className="pb-3 pr-4">Converted</th>
                <th className="pb-3 pr-4">Conversion</th>
                <th className="pb-3 pr-4">Pending FU</th>
                <th className="pb-3">Missed FU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...data.staffPerformance].sort((a, b) => b.conversionPct - a.conversionPct).map((p, i) => (
                <tr key={p.staffId}>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-3">
                      <span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-lime text-forest-950" : "bg-gray-100 text-gray-600"}`}>
                        {p.staffName.split(" ").map((w) => w[0]).join("")}
                      </span>
                      <span className="font-semibold">{p.staffName}</span>
                      {i === 0 && <Sparkles className="size-3.5 text-amber-500" />}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{p.assignedCustomers}</td>
                  <td className="py-3 pr-4">{p.convertedLeads}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-lime/25 px-2.5 py-0.5 text-xs font-bold text-forest-950">{p.conversionPct}%</span>
                  </td>
                  <td className="py-3 pr-4">{p.pendingFollowUps}</td>
                  <td className={`py-3 ${p.missedFollowUps > 0 ? "font-semibold text-red-600" : ""}`}>{p.missedFollowUps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Smart Insights — what's broken, why, and the next tap */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="size-5 text-amber-500" /> Smart Insights</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data.alerts.map((a) => (
            <Card key={a.title} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{a.title}</p>
                {a.urgency && (
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                    a.urgency === "High" ? "bg-red-50 text-red-600" : a.urgency === "Medium" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
                  }`}>
                    {a.urgency}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">{a.description}</p>
              {a.cause && (
                <p className="mt-3 text-xs text-gray-400">
                  <span className="font-bold uppercase tracking-wider">Likely cause</span> · {a.cause}
                </p>
              )}
              {a.actionPath && (
                <Link href={a.actionPath} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-forest-900 underline decoration-lime decoration-2 underline-offset-4">
                  {a.actionLabel ?? "Open"} →
                </Link>
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-gray-400">
        <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </Card>
  );
}

function Gauge({ value }: { value: number }) {
  // semicircle arc via conic gradient mask
  const deg = Math.min(180, Math.round((value / 100) * 180));
  const color = value >= 70 ? "#84cc16" : value >= 40 ? "#d97706" : "#e11d48";
  return (
    <div className="relative grid place-items-center">
      <div className="size-44 rounded-full"
        style={{ background: `conic-gradient(from 270deg, ${color} ${deg}deg, #e5e7eb ${deg}deg 180deg, transparent 180deg)`, maskImage: "radial-gradient(circle, transparent 56%, black 57%)", WebkitMaskImage: "radial-gradient(circle, transparent 56%, black 57%)" }} />
      <div className="absolute text-4xl font-bold">{value}</div>
      <div className="absolute translate-y-8 text-[11px] font-bold uppercase tracking-wider text-gray-400">/ 100</div>
    </div>
  );
}
