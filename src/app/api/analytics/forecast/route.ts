import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok } from "@/lib/api";
import { STAGES } from "@/lib/stages";

// GET /api/analytics/forecast — weighted pipeline + quota attainment.
//
// Won dates come from stage-move activities ("Moved X → converted"), not
// leads.updatedAt, so a converted lead that later got touched still counts
// in the month it actually closed.
const PROB: Record<string, number> = Object.fromEntries(STAGES.map((s) => [s.key, s.prob]));
const OPEN_STAGES = ["new", "contacted", "engaged", "qualified", "negotiation"];

export async function GET(_req: NextRequest) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // --- weighted pipeline over OPEN stages only (closed deals aren't "forecast") ---
  const rows = db.prepare(
    `SELECT l.status AS stage, COUNT(*) AS count, SUM(l.value) AS value
     FROM leads l WHERE l.status IN (${OPEN_STAGES.map(() => "?").join(",")})
     GROUP BY l.status`
  ).all(...OPEN_STAGES) as Array<{ stage: string; count: number; value: number | null }>;

  const byStage = STAGES
    .filter((s) => OPEN_STAGES.includes(s.key))
    .map((s) => {
      const r = rows.find((x) => x.stage === s.key);
      const value = r?.value ?? 0;
      return {
        stage: s.key, label: s.label, fill: s.fill, count: r?.count ?? 0, value,
        prob: s.prob, weighted: Math.round(value * (s.prob / 100)),
      };
    });
  const pipelineValue = byStage.reduce((a, s) => a + s.value, 0);
  const weightedValue = byStage.reduce((a, s) => a + s.weighted, 0);

  // --- won this month + 5-month trend, attributed via the converting activity ---
  const wonMoves = db.prepare(
    `SELECT a.customerId, a.createdAt FROM activities a
     WHERE a.kind = 'stage' AND (a.text LIKE '%→ converted' OR a.text LIKE '%to converted')
       AND a.createdAt >= ?`
  ).all(new Date(now.getFullYear(), now.getMonth() - 4, 1).toISOString()) as Array<{ customerId: string; createdAt: string }>;

  const wonValue = db.prepare(
    `SELECT l.customerId, l.value, c.assignedStaffId FROM leads l
     JOIN customers c ON c.id = l.customerId WHERE l.status = 'converted'`
  ).all() as Array<{ customerId: string; value: number; assignedStaffId: string | null }>;
  const wonByCustomer = new Map(wonValue.map((w) => [w.customerId, w]));

  const monthKey = (iso: string) => iso.slice(0, 7);
  const thisMonth = monthKey(now.toISOString());
  const trend: Array<{ month: string; label: string; won: number; deals: number }> = [];
  const monthsSeen = new Set<string>();
  let monthWonTotal = 0;
  let monthDeals = 0;
  const staffWonMonth = new Map<string, number>();

  for (const m of wonMoves) {
    const mk = monthKey(m.createdAt);
    const v = wonByCustomer.get(m.customerId);
    const amount = v?.value ?? 0;
    if (!trend.some((t) => t.month === mk)) trend.push({ month: mk, label: new Date(m.createdAt).toLocaleDateString("en-IN", { month: "short" }), won: 0, deals: 0 });
    monthsSeen.add(mk);
    const t = trend.find((x) => x.month === mk)!;
    t.won += amount;
    t.deals += 1;
    if (mk === thisMonth) {
      monthWonTotal += amount;
      monthDeals += 1;
      if (v?.assignedStaffId) staffWonMonth.set(v.assignedStaffId, (staffWonMonth.get(v.assignedStaffId) ?? 0) + amount);
    }
  }
  // fill empty months so the chart doesn't skip
  const allMonths: Array<{ month: string; label: string; won: number; deals: number }> = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    allMonths.push(trend.find((t) => t.month === mk) ?? { month: mk, label: d.toLocaleDateString("en-IN", { month: "short" }), won: 0, deals: 0 });
  }

  // --- quota attainment per staff ---
  const staff = db.prepare("SELECT id, name, quotaMonthly FROM staff WHERE isActive = 1").all() as Array<{ id: string; name: string; quotaMonthly: number }>;
  const quotas = staff.map((s) => ({
    staffId: s.id, staffName: s.name,
    quota: s.quotaMonthly, won: staffWonMonth.get(s.id) ?? 0,
    attainmentPct: s.quotaMonthly ? Math.round(((staffWonMonth.get(s.id) ?? 0) / s.quotaMonthly) * 100) : 0,
  }));
  const teamQuota = quotas.reduce((a, q) => a + q.quota, 0);

  return ok({
    pipeline: { byStage, pipelineValue, weightedValue },
    won: { month: thisMonth, total: monthWonTotal, deals: monthDeals },
    quota: {
      month: thisMonth, teamQuota,
      teamAttainmentPct: teamQuota ? Math.round((monthWonTotal / teamQuota) * 100) : 0,
      perStaff: quotas,
    },
    trend: allMonths,
  });
}
