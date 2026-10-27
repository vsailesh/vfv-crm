import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

type P = { params: Promise<{ id: string }> };

function parseJsonArray(raw: unknown): unknown[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// GET /api/wa/bots/[id]/flow — nodes, edges, name, version
export async function GET(_req: NextRequest, { params }: P) {
  const { id } = await params;
  const row = db.prepare("SELECT id, name, version, isActive, nodes, edges FROM wa_bots WHERE id = ?").get(id) as
    | { id: string; name: string; version: number; isActive: number; nodes: string; edges: string }
    | undefined;
  if (!row) return bad("chatbot not found", 404);
  return ok({ id: row.id, name: row.name, version: row.version, isActive: !!row.isActive, nodes: parseJsonArray(row.nodes), edges: parseJsonArray(row.edges) });
}

// PUT /api/wa/bots/[id]/flow — Save & Publish: persist nodes/edges/name, bump version
export async function PUT(req: NextRequest, { params }: P) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || !Array.isArray(b.nodes) || !Array.isArray(b.edges)) return bad("nodes and edges arrays are required");

  const row = db.prepare("SELECT id FROM wa_bots WHERE id = ?").get(id);
  if (!row) return bad("chatbot not found", 404);

  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim() : "Untitled flow";
  db.prepare("UPDATE wa_bots SET name = ?, nodes = ?, edges = ?, version = version + 1 WHERE id = ?").run(
    name, JSON.stringify(b.nodes), JSON.stringify(b.edges), id);
  const out = db.prepare("SELECT id, name, version FROM wa_bots WHERE id = ?").get(id);
  return ok(out);
}
