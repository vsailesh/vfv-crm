// Automation engine — workflows (trigger → task/note) + cadences (multi-touch step sequences).
// Runs inline on lead stage moves and lead creation. Steps materialize as
// follow-ups so they surface in the existing Follow-ups page; no cron needed.

import db from "./db";

type Action =
  | { type: "task"; title: string; dueInDays: number }
  | { type: "note"; text: string };

type WorkflowRow = { id: string; triggerOn: string; actions: string; enabled: number };
type CadenceRow = { id: string; name: string; stageKey: string; steps: string; active: number };
type CadenceStep = { day: number; channel: string; text: string };

function insertFollowup(customerId: string, title: string, dueInDays: number) {
  // re-enrollment guard: never stack the same pending follow-up twice
  const dup = db.prepare("SELECT 1 AS x FROM followups WHERE customerId = ? AND title = ? AND status = 'pending'").get(customerId, title);
  if (dup) return false;
  db.prepare("INSERT INTO followups (id, customerId, title, dueAt, status, createdAt) VALUES (?,?,?,?, 'pending', ?)").run(
    `fu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    customerId, title,
    new Date(Date.now() + dueInDays * 86_400_000).toISOString(),
    new Date().toISOString()
  );
  return true;
}

function logActivity(customerId: string, text: string) {
  db.prepare("INSERT INTO activities (id, customerId, kind, text, createdAt) VALUES (?,?, 'automation', ?, ?)").run(
    `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    customerId, text, new Date().toISOString()
  );
}

/** Run every enabled workflow matching this trigger against one customer. */
export function runWorkflows(triggerOn: string, customerId: string) {
  const rows = db.prepare("SELECT * FROM workflows WHERE triggerOn = ? AND enabled = 1").all(triggerOn) as WorkflowRow[];
  let fired = 0;
  for (const wf of rows) {
    for (const a of JSON.parse(wf.actions) as Action[]) {
      if (a.type === "task" && insertFollowup(customerId, a.title, a.dueInDays)) fired++;
      if (a.type === "note") { logActivity(customerId, a.text); fired++; }
    }
  }
  return fired;
}

/** Enroll a lead's customer in the cadence bound to its new stage (if any). */
export function runCadence(stageKey: string, customerId: string) {
  const cad = db.prepare("SELECT * FROM cadences WHERE stageKey = ? AND active = 1").get(stageKey) as CadenceRow | undefined;
  if (!cad) return 0;
  const steps = JSON.parse(cad.steps) as CadenceStep[];
  let made = 0;
  for (const s of steps) {
    const title = `${cad.name} · ${s.channel}: ${s.text}`;
    if (insertFollowup(customerId, title, s.day)) made++;
  }
  if (made) logActivity(customerId, `Enrolled in "${cad.name}" cadence (${made} steps)`);
  return made;
}

/** Full automation pass for a stage move. Returns counts for logging/testing. */
export function runStageAutomations(stageKey: string, customerId: string) {
  return {
    workflows: runWorkflows(`stage_enter:${stageKey}`, customerId),
    cadenceSteps: runCadence(stageKey, customerId),
  };
}
