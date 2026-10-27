import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

// PATCH /api/campaigns/[id] — {status: "sent"} dispatches the campaign
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (b?.status !== "sent" && b?.status !== "queued") return bad("status must be sent|queued");

  const row = db.prepare("SELECT id, status FROM campaigns WHERE id = ?").get(id) as
    | { id: string; status: string }
    | undefined;
  if (!row) return bad("campaign not found", 404);

  db.prepare("UPDATE campaigns SET status = ? WHERE id = ?").run(b.status, id);
  return ok({ id, status: b.status });
}
