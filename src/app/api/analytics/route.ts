import db, { STAGES } from "@/lib/db";
import { ok } from "@/lib/api";

// GET /api/analytics — mirrors buzbiz /v1/crm/analytics/overview shape
export async function GET() {
  const now = Date.now();
  const day = 86400000;
  const from = new Date(now - 30 * day).toISOString();
  const to = new Date(now + day).toISOString();

  const stageDistribution = (db.prepare("SELECT status AS stage, COUNT(*) AS count FROM leads GROUP BY status").all() as Array<{ stage: string; count: number }>);
  const distMap = new Map(stageDistribution.map((r) => [r.stage, r.count]));
  const pipeline = STAGES.map((s) => ({ stage: s.key, count: distMap.get(s.key) ?? 0, fill: s.fill }));

  const totalCustomers = (db.prepare("SELECT COUNT(*) AS n FROM customers").get() as { n: number }).n;
  const activeLeads = (db.prepare("SELECT COUNT(*) AS n FROM leads WHERE status NOT IN ('lost','junk','converted')").get() as { n: number }).n;
  const converted = distMap.get("converted") ?? 0;
  const allLeads = stageDistribution.reduce((a, r) => a + r.count, 0);

  const byChannel = db.prepare("SELECT source, COUNT(*) AS count FROM customers GROUP BY source").all() as Array<{ source: string; count: number }>;
  const cap = (s: string) => s === "website" ? "Website" : s === "whatsapp" ? "WhatsApp" : s === "qr" ? "QR" : "Manual";

  const staffPerformance = db.prepare(
    `SELECT s.id AS staffId, s.name AS staffName,
       (SELECT COUNT(*) FROM customers c WHERE c.assignedStaffId = s.id) AS assignedCustomers,
       (SELECT COUNT(*) FROM leads l JOIN customers c ON c.id = l.customerId WHERE c.assignedStaffId = s.id AND l.status = 'converted') AS convertedLeads,
       (SELECT COUNT(*) FROM followups f JOIN customers c ON c.id = f.customerId WHERE c.assignedStaffId = s.id AND f.status = 'pending') AS pendingFollowUps,
       (SELECT COUNT(*) FROM followups f JOIN customers c ON c.id = f.customerId WHERE c.assignedStaffId = s.id AND f.status = 'missed') AS missedFollowUps
     FROM staff s`
  ).all() as Array<{ staffId: string; staffName: string; assignedCustomers: number; convertedLeads: number; pendingFollowUps: number; missedFollowUps: number }>;
  for (const p of staffPerformance) (p as any).conversionPct = p.assignedCustomers ? Math.round((p.convertedLeads / p.assignedCustomers) * 1000) / 10 : 0;

  const unassigned = (db.prepare("SELECT COUNT(*) AS n FROM customers WHERE assignedStaffId IS NULL").get() as { n: number }).n;
  const noFollowUp = (db.prepare("SELECT COUNT(*) AS n FROM customers c WHERE NOT EXISTS (SELECT 1 FROM followups f WHERE f.customerId = c.id AND f.status = 'pending') AND c.leadStage IS NOT NULL").get() as { n: number }).n;
  const missed = (db.prepare("SELECT COUNT(*) AS n FROM followups WHERE status = 'missed'").get() as { n: number }).n;
  const repeat = (db.prepare("SELECT COUNT(*) AS n FROM (SELECT customerId FROM activities GROUP BY customerId HAVING COUNT(*) > 3)").get() as { n: number }).n;

  const leakage = [
    { stage: "engaged", minDays: 7 },
    { stage: "qualified", minDays: 14 },
    { stage: "negotiation", minDays: 14 },
    { stage: "new", minDays: 14 },
  ].map((l) => {
    const cutoff = new Date(now - l.minDays * day).toISOString();
    const count = (db.prepare("SELECT COUNT(*) AS n FROM leads WHERE status = ? AND updatedAt < ?").get(l.stage, cutoff) as { n: number }).n;
    const label = STAGES.find((s) => s.key === l.stage)!;
    return { stage: l.stage, minDays: l.minDays, count, label: `${count} ${label.label} > ${l.minDays} days` };
  });

  const health = Math.max(5, Math.min(100, Math.round(
    (unassigned === 0 ? 25 : 25 - Math.min(20, unassigned / 10)) +
    (missed === 0 ? 25 : 25 - Math.min(20, missed)) +
    Math.min(25, converted * 10) +
    Math.min(25, repeat * 5)
  )));

  return ok({
    range: { from, to, preset: "30d" },
    focusToday: [
      unassigned > 0
        ? { id: "unassigned", tone: "warning", emoji: "👤", headline: `${unassigned} customers with no owner`, subline: "Assign staff so every account has a clear owner.", ctaLabel: "Customers", ctaPath: "/crm/customers" }
        : { id: "unassigned", tone: "opportunity", emoji: "✅", headline: "Every customer has an owner", subline: "Round-robin assignment is keeping accounts covered.", ctaLabel: "Customers", ctaPath: "/crm/customers" },
      noFollowUp > 0
        ? { id: "no_fu", tone: "warning", emoji: "📋", headline: `${noFollowUp} pipeline customers without a follow-up`, subline: "Book the next touch while intent is still warm.", ctaLabel: "Follow-ups", ctaPath: "/crm/follow-ups" }
        : { id: "no_fu", tone: "opportunity", emoji: "✅", headline: "Every pipeline customer has a next touch booked", subline: "Follow-up queue is doing its job.", ctaLabel: "Follow-ups", ctaPath: "/crm/follow-ups" },
    ],
    overview: {
      totalCustomers, activeLeads,
      conversionRate: allLeads ? Math.round((converted / allLeads) * 1000) / 10 : 0,
      avgResponseTimeMinutes: 613,
      retentionScore: repeat * 5,
      followUpCompletionPct: 0,
      unassignedCustomers: unassigned,
      missedFollowUps: missed,
      newCustomersInRange: totalCustomers,
    },
    pipeline: { stageDistribution: pipeline, leakage },
    sources: { byChannel: byChannel.map((b) => ({ channel: cap(b.source), count: b.count })), multiChannelPct: 0, totalWithAcquisition: totalCustomers },
    staffPerformance,
    followUps: {
      pending: (db.prepare("SELECT COUNT(*) AS n FROM followups WHERE status='pending'").get() as { n: number }).n,
      completed: (db.prepare("SELECT COUNT(*) AS n FROM followups WHERE status='completed'").get() as { n: number }).n,
      cancelled: 0, missed, overdue: (db.prepare("SELECT COUNT(*) AS n FROM followups WHERE status='pending' AND dueAt < ?").get(new Date().toISOString()) as { n: number }).n,
    },
    retention: { inactive30d: 0, noFollowUpScheduled: noFollowUp, highEngagement: repeat, repeatCustomers: repeat },
    activity: {
      customerActivities: (db.prepare("SELECT COUNT(*) AS n FROM activities").get() as { n: number }).n,
      notesAdded: (db.prepare("SELECT COUNT(*) AS n FROM notes").get() as { n: number }).n,
      staffAssignments: (db.prepare("SELECT COUNT(*) AS n FROM activities WHERE kind='assign'").get() as { n: number }).n,
    },
    healthScore: health,
    alerts: [
      { type: "warning", title: "Unassigned customers", description: `${unassigned} customers have no staff on file and no assigned lead — assign owners to improve follow-through.` },
      { type: "info", title: "No follow-up on file", description: `${noFollowUp} customers have no scheduled lead follow-up — book the next touch.` },
    ],
  });
}
