"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ArrowDownWideNarrow, ChevronRight, Megaphone, Send, CheckCircle2, Clock, Trash2, Zap } from "lucide-react";
import { Card, SecondaryButton, PrimaryButton } from "@/components/ui";
import { STAGES } from "@/lib/stages";
import { RULE_SOURCES, RULE_STATUSES, SOURCE_LABEL, type SegRules } from "@/lib/segment-rules";

type Segment = {
  id: string; name: string; type: string; description: string | null;
  customerIds: string[]; count: number; updatedAt: string;
  rules?: SegRules | null;
  customers?: Array<{ id: string; name: string; phone: string }>;
};
type Campaign = {
  id: string; name: string; template: string; status: string;
  recipientCount: number; createdAt: string; segmentName: string | null;
};

function RuleGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-600">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function RuleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`h-7 rounded-full px-2.5 text-[11px] font-semibold capitalize transition-colors ${
        active ? "bg-forest-950 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}>
      {children}
    </button>
  );
}

export default function SegmentsPage() {
  const [rows, setRows] = useState<Segment[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [name, setName] = useState("");
  // dynamic builder state
  const [nType, setNType] = useState<"static" | "dynamic">("static");
  const [nDesc, setNDesc] = useState("");
  const [rules, setRules] = useState<SegRules>({});
  const [preview, setPreview] = useState<{ count: number; sample: Array<{ id: string; name: string; phone: string }> } | null>(null);
  const [composer, setComposer] = useState<Segment | null>(null);
  const [cName, setCName] = useState("");
  const [cTpl, setCtpl] = useState("Namaste {{name}}, ");
  const [cWhen, setCWhen] = useState("");
  const [cBusy, setCBusy] = useState(false);

  const load = useCallback(async () => {
    const segs = await fetch("/api/segments").then((r) => r.json());
    setRows(segs.data.data);
    const cmps = await fetch("/api/campaigns").then((r) => r.json());
    setCampaigns(cmps.data.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasRule = Boolean(rules.sources?.length || rules.stages?.length || rules.statuses?.length || rules.city?.trim());

  // live audience preview while building a dynamic segment
  useEffect(() => {
    if (!showNew || nType !== "dynamic" || !hasRule) { setPreview(null); return; }
    const t = setTimeout(async () => {
      const json = await fetch("/api/segments/preview", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rules }),
      }).then((r) => r.json());
      if (json?.data) setPreview(json.data);
    }, 300);
    return () => clearTimeout(t);
  }, [showNew, nType, rules, hasRule]);

  async function removeSegment(id: string, name: string) {
    if (!window.confirm(`Delete segment "${name}"? Campaigns already sent keep their counts.`)) return;
    await fetch(`/api/segments?id=${id}`, { method: "DELETE" });
    setExpanded(null);
    load();
  }

  async function toggleDetails(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    const seg = rows.find((r) => r.id === id);
    if (seg && !seg.customers && seg.customerIds.length > 0) {
      const json = await fetch(`/api/customers?limit=100`).then((r) => r.json());
      const byId = new Map(json.data.data.map((c: any) => [c.id, c]));
      seg.customers = seg.customerIds.map((cid) => byId.get(cid) as { id: string; name: string; phone: string } | undefined).filter((x): x is { id: string; name: string; phone: string } => Boolean(x));
      setRows([...rows]);
    }
    setExpanded(id);
  }

  async function create() {
    if (!name.trim()) return;
    if (nType === "dynamic" && !hasRule) return;
    await fetch("/api/segments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nType === "dynamic"
        ? { name: name.trim(), type: "dynamic", description: nDesc.trim() || null, rules }
        : { name: name.trim(), type: "static", description: nDesc.trim() || null }),
    });
    setName(""); setNDesc(""); setNType("static"); setRules({}); setPreview(null);
    setShowNew(false);
    load();
  }

  function toggleRuleList(key: "sources" | "stages" | "statuses", v: string) {
    const cur = rules[key] ?? [];
    setRules({ ...rules, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  }

  async function launchCampaign() {
    if (!composer || !cName.trim() || !cTpl.trim()) return;
    setCBusy(true);
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segmentId: composer.id, name: cName.trim(), template: cTpl.trim(), scheduledAt: cWhen || undefined }),
    });
    setCBusy(false);
    setComposer(null);
    setCName("");
    setCtpl("Namaste {{name}}, ");
    setCWhen("");
    load();
  }

  async function dispatch(id: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    load();
  }

  const totalAudience = rows.reduce((a, r) => a + r.count, 0);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Card className="flex flex-wrap items-start justify-between gap-6 p-7">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Customer Segments</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Build audience segments for targeted WhatsApp campaigns and sharper outreach.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SecondaryButton><ArrowDownWideNarrow className="size-4 text-gray-500" /> Newest First</SecondaryButton>
          <PrimaryButton onClick={() => setShowNew(true)}><Plus className="size-4" /> New Segment</PrimaryButton>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Segments</p>
          <p className="mt-1 text-3xl font-bold">{rows.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Segmented Audience</p>
          <p className="mt-1 text-3xl font-bold">{totalAudience}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((s) => (
          <Card key={s.id} className="flex flex-col p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {s.type === "static" ? "Manual List" : (
                <span className="flex items-center gap-1"><Zap className="size-3 text-amber-500" /> Dynamic · Auto-updating</span>
              )}
            </p>
            <h3 className="mt-1 flex items-center justify-between gap-2 text-lg font-bold">
              {s.name}
              <button onClick={() => removeSegment(s.id, s.name)} aria-label={`Delete ${s.name}`}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500">
                <Trash2 className="size-4" />
              </button>
            </h3>
            <p className="mt-1 text-sm text-gray-500">{s.description ?? "No description provided."}</p>
            {s.type === "dynamic" && s.rules && (
              <p className="mt-2 flex flex-wrap gap-1">
                {s.rules.sources?.map((v) => (
                  <span key={`src-${v}`} className="rounded-full bg-forest-950/5 px-2 py-0.5 text-[10px] font-semibold text-forest-800">source: {SOURCE_LABEL[v] ?? v}</span>
                ))}
                {s.rules.stages?.map((v) => (
                  <span key={`st-${v}`} className="rounded-full bg-forest-950/5 px-2 py-0.5 text-[10px] font-semibold text-forest-800">stage: {STAGES.find((x) => x.key === v)?.label ?? v}</span>
                ))}
                {s.rules.statuses?.map((v) => (
                  <span key={`stt-${v}`} className="rounded-full bg-forest-950/5 px-2 py-0.5 text-[10px] font-semibold text-forest-800">status: {v}</span>
                ))}
                {s.rules.city && (
                  <span className="rounded-full bg-forest-950/5 px-2 py-0.5 text-[10px] font-semibold text-forest-800">city: {s.rules.city}</span>
                )}
              </p>
            )}
            <div className="mt-4 space-y-1 text-xs text-gray-400">
              <p><span className="font-bold text-gray-900">{s.count}</span> AUDIENCE</p>
              <p>LAST UPDATED {new Date(s.updatedAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" }).toUpperCase()}</p>
            </div>
            {expanded === s.id && s.customers && (
              <ul className="mt-4 space-y-1.5 rounded-xl bg-gray-50 p-3">
                {s.customers.length === 0 && <li className="text-xs text-gray-400">No customers in this segment yet.</li>}
                {s.customers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{c.name}</span>
                    <span className="text-gray-400">+91 {c.phone}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex gap-2">
              <button onClick={() => toggleDetails(s.id)} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl border border-gray-200 text-xs font-semibold hover:bg-gray-50">
                {expanded === s.id ? "Hide Details" : "View Details"}
                <ChevronRight className={`size-3 transition-transform ${expanded === s.id ? "rotate-90" : ""}`} />
              </button>
              <button onClick={() => setComposer(s)} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-forest-950 text-xs font-semibold text-white hover:opacity-90">
                <Megaphone className="size-3" /> Campaign
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* campaigns */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Campaigns</h2>
            <p className="text-sm text-gray-500">WhatsApp blasts queued against your segments.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{campaigns.length} total</span>
        </div>
        {campaigns.length === 0 ? (
          <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
            No campaigns yet. Hit “Campaign” on a segment to compose one.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {campaigns.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-4 py-3.5">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${m.status === "sent" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                  {m.status === "sent" ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {m.segmentName ?? "segment"} · {m.recipientCount} recipients · {new Date(m.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                  m.status === "sent" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                }`}>{m.status}</span>
                {m.status === "queued" && (
                  <button onClick={() => dispatch(m.id)}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-forest-950 px-3 text-xs font-semibold text-white hover:opacity-90">
                    <Send className="size-3" /> Send now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {showNew && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setShowNew(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">New Segment</h2>

            {/* type toggle */}
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
              {(["static", "dynamic"] as const).map((t) => (
                <button key={t} onClick={() => setNType(t)}
                  className={`h-9 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                    nType === t ? "bg-white text-forest-950 shadow-sm" : "text-gray-500"
                  }`}>
                  {t === "static" ? "Manual List" : "Dynamic ⚡"}
                </button>
              ))}
            </div>

            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Segment name" autoFocus
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            <input value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="Description (optional)"
              className="mt-2 h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />

            {nType === "dynamic" && (
              <div className="mt-4 space-y-4">
                <p className="text-xs leading-relaxed text-gray-500">
                  Members are computed live from these rules — the segment updates itself as customers change.
                </p>

                <RuleGroup label="Source">
                  {RULE_SOURCES.map((s) => (
                    <RuleChip key={s} active={rules.sources?.includes(s) ?? false} onClick={() => toggleRuleList("sources", s)}>{SOURCE_LABEL[s]}</RuleChip>
                  ))}
                </RuleGroup>
                <RuleGroup label="Pipeline stage">
                  {STAGES.map((s) => (
                    <RuleChip key={s.key} active={rules.stages?.includes(s.key) ?? false} onClick={() => toggleRuleList("stages", s.key)}>{s.label}</RuleChip>
                  ))}
                </RuleGroup>
                <RuleGroup label="Customer status">
                  {RULE_STATUSES.map((s) => (
                    <RuleChip key={s} active={rules.statuses?.includes(s) ?? false} onClick={() => toggleRuleList("statuses", s)}>{s}</RuleChip>
                  ))}
                </RuleGroup>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">City contains</label>
                  <input value={rules.city ?? ""} onChange={(e) => setRules({ ...rules, city: e.target.value })} placeholder="e.g. Bengaluru"
                    className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
                </div>

                {preview && (
                  <div className="rounded-xl bg-lime/10 p-3">
                    <p className="text-sm font-bold text-forest-800">{preview.count} customers match right now</p>
                    {preview.sample.length > 0 && (
                      <p className="mt-1 truncate text-xs text-gray-500">
                        e.g. {preview.sample.map((s) => s.name).join(", ")}{preview.count > preview.sample.length ? ", …" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowNew(false)} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={create} disabled={!name.trim() || (nType === "dynamic" && !hasRule)}
                className="h-10 flex-1 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* campaign composer */}
      {composer && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setComposer(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center gap-2">
              <Megaphone className="size-4 text-forest-950" />
              <h2 className="text-lg font-bold">New Campaign</h2>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              To segment <span className="font-semibold text-gray-700">{composer.name}</span> · {composer.count} recipients
            </p>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Campaign name</label>
            <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. Panchakarma week promo" autoFocus
              className="mb-4 h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            <label className="mb-1 block text-xs font-semibold text-gray-600">Message template</label>
            <textarea value={cTpl} onChange={(e) => setCtpl(e.target.value)} rows={4}
              placeholder="Namaste {{name}}, ..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            <p className="mt-1.5 text-xs text-gray-400">
              Use <code className="rounded bg-gray-100 px-1 font-mono">{"{{name}}"}</code> to personalize with each customer’s name.
            </p>
            <label className="mb-1 mt-4 block text-xs font-semibold text-gray-600">Schedule (optional)</label>
            <input type="datetime-local" value={cWhen} onChange={(e) => setCWhen(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            <p className="mt-1 text-xs text-gray-400">Leave empty to queue for manual launch from the WhatsApp Scheduler.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setComposer(null)} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={launchCampaign} disabled={!cName.trim() || !cTpl.trim() || cBusy}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">
                <Send className="size-3.5" /> {cBusy ? "Queueing…" : "Queue campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
