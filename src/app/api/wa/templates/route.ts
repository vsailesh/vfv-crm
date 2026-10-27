import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

// GET /api/wa/templates?q=&status=&category=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q");
  const status = sp.get("status");
  const category = sp.get("category");

  let where = " WHERE 1=1";
  const params: unknown[] = [];
  if (q) { where += " AND name LIKE ?"; params.push(`%${q}%`); }
  if (status && status !== "all") { where += " AND status = ?"; params.push(status); }
  if (category && category !== "all") { where += " AND category = ?"; params.push(category); }

  const rows = db.prepare(`SELECT * FROM wa_templates${where} ORDER BY createdAt DESC`).all(...params);
  return ok({ data: rows });
}

// POST /api/wa/templates — register a template (pending until Meta approves)
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const { name, category, body, language } = b ?? {};
  if (!name || typeof name !== "string" || !name.trim()) return bad("template name is required");
  if (!body || typeof body !== "string" || !body.trim()) return bad("template body is required");

  const cats = new Set(["marketing", "utility", "authentication"]);
  const id = `wtpl_${Date.now().toString(36)}`;
  const metaId = String(1000000000000000 + Math.floor(Math.random() * 899999999999999));
  db.prepare(
    "INSERT INTO wa_templates (id, metaTemplateId, name, category, status, language, body, createdAt) VALUES (?,?,?,?,?,?,?,?)"
  ).run(id, metaId, name.trim(), cats.has(category) ? category : "marketing", "pending",
    language === "en_US" ? "en_US" : "en_GB", body.trim(), new Date().toISOString());

  return ok(db.prepare("SELECT * FROM wa_templates WHERE id = ?").get(id));
}
