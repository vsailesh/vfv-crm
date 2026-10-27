// Pipeline stages — shared by server routes and client pages.
// Kept free of any node-only imports so client components can use it.
export const STAGES = [
  { key: "new", label: "New", fill: "#6366f1" },
  { key: "contacted", label: "Contacted", fill: "#ec4899" },
  { key: "engaged", label: "Engaged", fill: "#d97706" },
  { key: "qualified", label: "Qualified", fill: "#0891b2" },
  { key: "negotiation", label: "Negotiation", fill: "#ea580c" },
  { key: "converted", label: "Converted", fill: "#84cc16" },
  { key: "on_hold", label: "On Hold", fill: "#64748b" },
  { key: "unresponsive", label: "Unresponsive", fill: "#e11d48" },
  { key: "lost", label: "Lost", fill: "#dc2626" },
  { key: "junk", label: "Junk", fill: "#94a3b8" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];
