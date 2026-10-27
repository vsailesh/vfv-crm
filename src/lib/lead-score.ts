// Lead score — pure heuristic (0-100) from lead + customer signals.
// Shared by server routes; no node-only imports so clients can reuse it too.

const STAGE_WEIGHT: Record<string, number> = {
  new: 10,
  contacted: 25,
  engaged: 40,
  qualified: 60,
  negotiation: 80,
  converted: 100,
  on_hold: 20,
  unresponsive: 5,
  lost: 0,
  junk: 0,
};

const SOURCE_WEIGHT: Record<string, number> = {
  referral: 15,
  website: 10,
  whatsapp: 8,
  gmb: 8,
  manual: 3,
};

export type LeadScoreInput = {
  status: string;
  source: string;
  activityCount: number;
  noteCount: number;
  updatedAt: string;
};

export function leadScore(l: LeadScoreInput): number {
  let s = STAGE_WEIGHT[l.status] ?? 10;
  s += SOURCE_WEIGHT[l.source] ?? 0;
  s += Math.min(l.activityCount * 4, 20); // engagement
  s += Math.min(l.noteCount * 5, 10); // diligence
  const days = (Date.now() - new Date(l.updatedAt).getTime()) / 86_400_000;
  s += days <= 7 ? 10 : days <= 14 ? 5 : 0; // recency
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function scoreTone(score: number): "hot" | "warm" | "cold" {
  return score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
}
