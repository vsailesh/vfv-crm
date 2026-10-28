// Pipeline stages — shared by server routes and client pages.
// Kept free of any node-only imports so client components can use it.
// prob = historical win probability (%) used for weighted-forecast math.
export const STAGES = [
  { key: "new", label: "New", fill: "#6366f1", prob: 5 },
  { key: "contacted", label: "Contacted", fill: "#ec4899", prob: 10 },
  { key: "engaged", label: "Engaged", fill: "#d97706", prob: 25 },
  { key: "qualified", label: "Qualified", fill: "#0891b2", prob: 60 },
  { key: "negotiation", label: "Negotiation", fill: "#ea580c", prob: 80 },
  { key: "converted", label: "Converted", fill: "#84cc16", prob: 100 },
  { key: "on_hold", label: "On Hold", fill: "#64748b", prob: 10 },
  { key: "unresponsive", label: "Unresponsive", fill: "#e11d48", prob: 5 },
  { key: "lost", label: "Lost", fill: "#dc2626", prob: 0 },
  { key: "junk", label: "Junk", fill: "#94a3b8", prob: 0 },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];
