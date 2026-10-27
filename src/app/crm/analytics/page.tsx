"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, AlertTriangle, Users, Target, Zap, Activity } from "lucide-react";
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
  alerts: Array<{ type: string; title: string; description: string }>;
};

const RANGES = ["7d", "30d", "90d"] as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>("30d");

  useEffect(() => {
    fetch(`/api/analytics?range=${range}`).then((r) => r.json()).then((j) => setData(j.data));
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

      {/* health gauge + pipeline story */}
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

      {/* alerts */}
      <section className="grid gap-4 md:grid-cols-2">
        {data.alerts.map((a) => (
          <Card key={a.title} className="flex items-start gap-3 p-5">
            <span className={`mt-0.5 size-2.5 shrink-0 rounded-full ${a.type === "warning" ? "bg-amber-500" : "bg-sky-500"}`} />
            <div>
              <p className="text-sm font-bold">{a.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{a.description}</p>
            </div>
          </Card>
        ))}
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
