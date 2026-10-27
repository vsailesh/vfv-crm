import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";
import { parseRules, rulesWhere, hasAnyRule, type SegRules } from "@/lib/segment-rules";

// Resolve a dynamic segment's rules to its live members (id, name, phone).
export function resolveMembers(r: SegRules): Array<{ id: string; name: string; phone: string }> {
  const w = rulesWhere(r);
  if (!w) return [];
  return db.prepare(
    `SELECT c.id, c.name, c.phone FROM customers c${w.where} ORDER BY c.updatedAt DESC LIMIT 500`
  ).all(...w.params) as Array<{ id: string; name: string; phone: string }>;
}

export async function GET() {
  const rows = (db.prepare("SELECT * FROM segments ORDER BY createdAt DESC").all() as Array<Record<string, string>>).map((s) => {
    if (s.type === "dynamic") {
      const rules = parseRules(s.rules);
      const members = rules ? resolveMembers(rules) : [];
      return {
        ...s,
        customerIds: members.map((m) => m.id),
        rules,
        count: members.length,
        customers: members.slice(0, 100),
      };
    }
    const ids = JSON.parse(s.customerIds) as string[];
    return { ...s, customerIds: ids, rules: null, count: ids.length };
  });
  return ok({ data: rows });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.name) return bad("name required");
  const type = b.type === "dynamic" ? "dynamic" : "static";
  if (type === "dynamic" && !hasAnyRule(b.rules ?? null)) return bad("dynamic segments need at least one rule");
  const now = new Date().toISOString();
  const id = `seg_${Date.now().toString(36)}`;
  db.prepare("INSERT INTO segments (id, name, type, description, customerIds, rules, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, b.name, type, b.description ?? null,
      type === "static" ? JSON.stringify(b.customerIds ?? []) : "[]",
      type === "dynamic" ? JSON.stringify(b.rules) : null, now, now);
  return ok({ id });
}

// PATCH — rename / re-describe / re-scope a segment
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("id required");
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const f of ["name", "description"] as const) {
    if (typeof b[f] === "string") { sets.push(`${f} = ?`); params.push(b[f]); }
  }
  if (Array.isArray(b.customerIds)) { sets.push("customerIds = ?"); params.push(JSON.stringify(b.customerIds)); }
  if (b.rules && typeof b.rules === "object") { sets.push("rules = ?"); params.push(JSON.stringify(b.rules)); }
  if (!sets.length) return bad("nothing to update");
  sets.push("updatedAt = ?");
  params.push(new Date().toISOString(), b.id);
  db.prepare(`UPDATE segments SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return ok({ id: b.id });
}

// DELETE ?id= — remove a segment (campaigns keep their snapshot counts)
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("id required");
  const res = db.prepare("DELETE FROM segments WHERE id = ?").run(id);
  if (res.changes === 0) return bad("segment not found", 404);
  return ok({ id, deleted: true });
}
