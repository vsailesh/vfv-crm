// Dynamic segment rules — JSON filter over customers, resolved to a live member list.
// Kept pure (SQL string builder) so both API routes and tests can use it.

export type SegRules = {
  sources?: string[];   // c.source IN (...)
  stages?: string[];    // c.leadStage IN (...) — current pipeline stage
  statuses?: string[];  // c.status IN (...) — prospect | active
  city?: string;        // c.city LIKE %...%
};

export const RULE_SOURCES = ["website", "whatsapp", "manual", "qr"] as const;
export const RULE_STATUSES = ["prospect", "active"] as const;

export const SOURCE_LABEL: Record<string, string> = {
  website: "Website", whatsapp: "WhatsApp", manual: "Manual", qr: "QR",
};

export function parseRules(raw: string | null | undefined): SegRules | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as SegRules;
    if (!r || typeof r !== "object") return null;
    return r;
  } catch {
    return null;
  }
}

// Builds the WHERE fragment for a rules object. Returns null when the rules
// select nothing (empty arrays) — caller decides what that means.
export function rulesWhere(r: SegRules): { where: string; params: unknown[] } | null {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (r.sources?.length) {
    clauses.push(`c.source IN (${r.sources.map(() => "?").join(",")})`);
    params.push(...r.sources);
  }
  if (r.stages?.length) {
    clauses.push(`c.leadStage IN (${r.stages.map(() => "?").join(",")})`);
    params.push(...r.stages);
  }
  if (r.statuses?.length) {
    clauses.push(`c.status IN (${r.statuses.map(() => "?").join(",")})`);
    params.push(...r.statuses);
  }
  if (r.city?.trim()) {
    clauses.push("c.city LIKE ?");
    params.push(`%${r.city.trim()}%`);
  }
  if (!clauses.length) return null;
  return { where: ` WHERE c.status != 'archived' AND ${clauses.join(" AND ")}`, params };
}

export function hasAnyRule(r: SegRules | null): boolean {
  if (!r) return false;
  return Boolean(r.sources?.length || r.stages?.length || r.statuses?.length || r.city?.trim());
}
