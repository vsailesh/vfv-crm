import db from "@/lib/db";

// Lead assignment — least-loaded available staff under their capacity cap.
// maxActiveLeads = 0 means "no cap set" (unlimited).
// Shared by manual lead creation, bulk import, and the web-to-lead webhook
// so every entry point assigns the same way.

const CLOSED = new Set(["converted", "lost", "junk"]);

export function isOpenStage(status: string): boolean {
  return !CLOSED.has(status);
}

// Pick the owner for a new lead, or null when everyone is at capacity.
// Does NOT increment — pair with bumpLoad() once the lead row exists.
export function pickOwner(): string | null {
  const row = db.prepare(
    `SELECT id FROM staff
     WHERE isActive = 1 AND isAvailable = 1 AND (maxActiveLeads = 0 OR currentActiveLeads < maxActiveLeads)
     ORDER BY currentActiveLeads ASC, id ASC
     LIMIT 1`
  ).get() as { id: string } | undefined;
  return row?.id ?? null;
}

// +1 when a lead lands on a staff member in an open stage, -1 when it leaves.
export function bumpLoad(staffId: string | null | undefined, delta: 1 | -1) {
  if (!staffId) return;
  db.prepare("UPDATE staff SET currentActiveLeads = MAX(0, currentActiveLeads + ?) WHERE id = ?").run(delta, staffId);
}

// Reconcile the counter when a lead changes stage:
// open→closed releases capacity, closed→open takes it back.
export function stageTransition(oldStatus: string, newStatus: string, staffId: string | null | undefined) {
  if (!staffId) return;
  if (isOpenStage(oldStatus) && !isOpenStage(newStatus)) bumpLoad(staffId, -1);
  else if (!isOpenStage(oldStatus) && isOpenStage(newStatus)) bumpLoad(staffId, 1);
}
