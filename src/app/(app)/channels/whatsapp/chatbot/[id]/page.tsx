"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Zap, MessageSquare, HelpCircle, MousePointerClick, ListTree, LayoutTemplate,
  GitBranch, Globe, Table2, UserCog, Tags, UserCheck, CheckCircle2, XCircle, Bot,
  Plus, X, Save, ChevronLeft, ChevronDown, ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Trash2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Node catalog — mirrors the buzbiz palette: 5 groups, 14 node types.
// ---------------------------------------------------------------------------

type NodeKind =
  | "trigger" | "askQ" | "sendMsg" | "buttons" | "lists" | "sendTpl"
  | "condition" | "http" | "sheet" | "attr" | "tags" | "optin" | "optout"
  | "assign" | "subBot";

type Spec = { label: string; icon: typeof Zap; tone: string; group: string };

const TONES = {
  orange: "bg-orange-500",
  green: "bg-emerald-600",
  violet: "bg-violet-600",
  sky: "bg-sky-600",
  slate: "bg-slate-600",
} as const;

const SPECS: Record<NodeKind, Spec> = {
  trigger:   { label: "Trigger Keyword",     icon: Zap,              tone: "orange", group: "Entry Points" },
  askQ:      { label: "Ask a Question",      icon: HelpCircle,       tone: "green",  group: "Messages & Replies" },
  sendMsg:   { label: "Send Message",        icon: MessageSquare,    tone: "green",  group: "Messages & Replies" },
  buttons:   { label: "Interactive / Buttons", icon: MousePointerClick, tone: "green", group: "Messages & Replies" },
  lists:     { label: "Lists",               icon: ListTree,         tone: "green",  group: "Messages & Replies" },
  sendTpl:   { label: "Send Template",       icon: LayoutTemplate,   tone: "green",  group: "Messages & Replies" },
  condition: { label: "Set a Condition",     icon: GitBranch,        tone: "violet", group: "Logic & Data" },
  http:      { label: "HTTP Call",           icon: Globe,            tone: "violet", group: "Logic & Data" },
  sheet:     { label: "Spreadsheet Action",  icon: Table2,           tone: "violet", group: "Logic & Data" },
  attr:      { label: "Update Attribute",    icon: UserCog,          tone: "sky",    group: "Contact Operations" },
  tags:      { label: "Set Tags",            icon: Tags,             tone: "sky",    group: "Contact Operations" },
  optin:     { label: "Subscribe (Opt-In)",  icon: CheckCircle2,     tone: "sky",    group: "Contact Operations" },
  optout:    { label: "Unsubscribe (Opt-Out)", icon: XCircle,        tone: "sky",    group: "Contact Operations" },
  assign:    { label: "Assign to Agent",     icon: UserCheck,        tone: "sky",    group: "Contact Operations" },
  subBot:    { label: "Trigger Another Chatbot", icon: Bot,          tone: "slate",  group: "Flow Control" },
};

const GROUPS: Array<{ label: string; badge?: string; kinds: NodeKind[] }> = [
  { label: "Entry Points", badge: "Start", kinds: ["trigger"] },
  { label: "Messages & Replies", kinds: ["askQ", "sendMsg", "buttons", "lists", "sendTpl"] },
  { label: "Logic & Data", kinds: ["condition", "http", "sheet"] },
  { label: "Contact Operations", kinds: ["attr", "tags", "optin", "optout", "assign"] },
  { label: "Flow Control", kinds: ["subBot"] },
];

function defaultsFor(kind: NodeKind): Record<string, unknown> {
  switch (kind) {
    case "trigger":   return { keywords: [] };
    case "sendMsg":   return { mode: "text", body: "", saveAs: "" };
    case "askQ":      return { question: "", saveAs: "" };
    case "buttons":   return { body: "", options: [] };
    case "lists":     return { header: "", rows: "" };
    case "sendTpl":   return { template: "" };
    case "condition": return { variable: "", op: "contains", value: "" };
    case "http":      return { method: "GET", url: "" };
    case "sheet":     return { action: "append", sheet: "" };
    case "attr":      return { attribute: "", value: "" };
    case "tags":      return { keywords: [] };
    case "assign":    return { agent: "" };
    case "subBot":    return { bot: "" };
    default:          return {};
  }
}

// ---------------------------------------------------------------------------
// Node card — colored header band + inline editor body + L/R ports
// ---------------------------------------------------------------------------

type VfvData = Record<string, unknown>;
type VfvNode = Node & { data: VfvData };

function NodeCard({ id, data, selected }: NodeProps) {
  // Every canvas node shares the render type "vfv"; the semantic kind lives in data.
  const kind = ((data as VfvData).kind as NodeKind) ?? "sendMsg";
  const spec = SPECS[kind] ?? SPECS.sendMsg;
  const { update, remove } = useNodeActions();
  const Icon = spec.icon;

  return (
    <div className={`w-72 rounded-2xl bg-white shadow-lg ring-1 ring-black/5 ${selected ? "ring-2 ring-lime" : ""}`}>
      <div className={`flex items-center gap-2 rounded-t-2xl px-3.5 py-2.5 ${TONES[spec.tone as keyof typeof TONES] ?? TONES.green}`}>
        {kind !== "trigger" && <Handle type="target" position={Position.Left} className="!size-2.5 !border-2 !border-white !bg-slate-400" />}
        <span className="grid size-6 place-items-center rounded-full bg-white/25"><Icon className="size-3.5 text-white" /></span>
        <span className="text-sm font-bold text-white">{spec.label}</span>
        <button onClick={() => remove(id)} aria-label={`Delete this ${spec.label} node`} className="ml-auto rounded p-0.5 text-white/70 hover:bg-white/20 hover:text-white">
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        <NodeBody kind={kind} data={data} update={update} id={id} />
      </div>

      <Handle type="source" position={Position.Right} className="!size-2.5 !border-2 !border-white !bg-slate-400" />
    </div>
  );
}

// Per-type inline editors. Fields write straight into node.data via update().
function NodeBody({ kind, data, update, id }: { kind: NodeKind; data: VfvData; update: (id: string, patch: VfvData) => void; id: string }) {
  const set = (patch: VfvData) => update(id, patch);

  const chipField = (label: string, key: string, placeholder: string) => {
    const chips = (data[key] as string[]) ?? [];
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <ChipInput chips={chips} placeholder={placeholder} onChange={(v) => set({ [key]: v })} />
        {chips.length === 0 && <p className="mt-1 text-[10px] text-gray-400">No {label.toLowerCase()} yet — flow won&apos;t fire.</p>}
      </div>
    );
  };

  const labeled = (label: string, key: string, placeholder: string, opts?: { max?: number }) => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <input
        value={(data[key] as string) ?? ""}
        onChange={(e) => set({ [key]: e.target.value.slice(0, opts?.max ?? 200) })}
        placeholder={placeholder}
        className="mt-1 h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-lime"
      />
    </div>
  );

  switch (kind) {
    case "trigger":
    case "tags":
      return chipField(kind === "trigger" ? "Trigger Keywords" : "Tags", "keywords", kind === "trigger" ? "e.g. hi, hello, start" : "e.g. vip, followup");
    case "sendMsg":
      return (
        <>
          <div className="flex gap-1">
            {(["text", "image", "doc"] as const).map((m) => (
              <button key={m} onClick={() => set({ mode: m })}
                className={`h-7 flex-1 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                  data.mode === m ? "bg-forest-950 text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                {m}
              </button>
            ))}
          </div>
          {data.mode !== "text" && labeled("Media URL", "mediaUrl", data.mode === "image" ? "https://…/poster.jpg" : "https://…/menu.pdf")}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Message Text</p>
            <textarea
              value={(data.body as string) ?? ""}
              onChange={(e) => set({ body: e.target.value.slice(0, 1024) })}
              rows={3}
              placeholder={data.mode === "text" ? "Type the message this node sends…" : "Caption (optional)…"}
              className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-lime"
            />
            <p className="text-right text-[10px] text-gray-400">{((data.body as string) ?? "").length}/1024</p>
          </div>
          {labeled("Store Response In (Optional)", "saveAs", "user name", { max: 16 })}
        </>
      );
    case "askQ":
      return (
        <>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Question</p>
            <textarea
              value={(data.question as string) ?? ""}
              onChange={(e) => set({ question: e.target.value.slice(0, 1024) })}
              rows={2}
              placeholder="What would you like to know?"
              className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-lime"
            />
          </div>
          {labeled("Store Response In", "saveAs", "topic", { max: 16 })}
        </>
      );
    case "buttons":
      return (
        <>
          {labeled("Message", "body", "Pick one and we'll take it from there")}
          <ChipInput chips={(data.options as string[]) ?? []} placeholder="Button label + Add" onChange={(v) => set({ options: v.slice(0, 3) })} />
          <p className="text-[10px] text-gray-400">Up to 3 quick-reply buttons.</p>
        </>
      );
    case "lists":
      return (
        <>
          {labeled("Section Header", "header", "Our services")}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Rows (one per line)</p>
            <textarea
              value={(data.rows as string) ?? ""}
              onChange={(e) => set({ rows: e.target.value.slice(0, 1024) })}
              rows={3}
              placeholder={"Panchakarma\nConsultation\nFollow-up"}
              className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-lime"
            />
          </div>
        </>
      );
    case "sendTpl":
      return labeled("Approved Template", "template", "banner_08");
    case "condition":
      return (
        <>
          {labeled("Variable", "variable", "last reply")}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Matches</p>
            <div className="mt-1 flex gap-1.5">
              <select value={(data.op as string) ?? "contains"} onChange={(e) => set({ op: e.target.value })}
                className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs outline-none focus:bg-white">
                <option value="contains">contains</option>
                <option value="is">is</option>
                <option value="not">is not</option>
              </select>
              <input value={(data.value as string) ?? ""} onChange={(e) => set({ value: e.target.value })} placeholder="value"
                className="h-9 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            </div>
          </div>
        </>
      );
    case "http":
      return (
        <>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Method</p>
            <select value={(data.method as string) ?? "GET"} onChange={(e) => set({ method: e.target.value })}
              className="mt-1 h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs outline-none focus:bg-white">
              {["GET", "POST", "PUT", "DELETE"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          {labeled("URL", "url", "https://api.example.com/leads")}
        </>
      );
    case "sheet":
      return (
        <>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Action</p>
            <select value={(data.action as string) ?? "append"} onChange={(e) => set({ action: e.target.value })}
              className="mt-1 h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs outline-none focus:bg-white">
              <option value="append">Append row</option>
              <option value="update">Update row</option>
            </select>
          </div>
          {labeled("Sheet", "sheet", "Leads 2026")}
        </>
      );
    case "attr":
      return (
        <>
          {labeled("Attribute", "attribute", "city")}
          {labeled("Value", "value", "Bengaluru")}
        </>
      );
    case "optin":
      return <p className="text-xs leading-relaxed text-gray-500">Subscribes the contact to marketing broadcasts. No configuration needed.</p>;
    case "optout":
      return <p className="text-xs leading-relaxed text-gray-500">Unsubscribes the contact from marketing broadcasts. No configuration needed.</p>;
    case "assign":
      return labeled("Agent", "agent", "e.g. Sailesh");
    case "subBot":
      return labeled("Chatbot", "bot", "e.g. welcome");
    default:
      return null;
  }
}

function ChipInput({ chips, placeholder, onChange }: { chips: string[]; placeholder: string; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim().toLowerCase();
    if (!v || chips.includes(v)) return;
    onChange([...chips, v]);
    setDraft("");
  }
  return (
    <div className="mt-1">
      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="h-9 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-lime"
        />
        <button onClick={add} disabled={!draft.trim()}
          className="h-9 rounded-lg bg-indigo-500 px-3 text-[11px] font-bold text-white hover:bg-indigo-600 disabled:opacity-40">+ Add</button>
      </div>
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-orange-700">
              {c}
              <button onClick={() => onChange(chips.filter((x) => x !== c))} aria-label={`Remove ${c}`} className="text-orange-400 hover:text-orange-700">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Shared mutation hooks — provided by the canvas parent via context.
const NodeActionsCtx = createContext<{ update: (id: string, patch: VfvData) => void; remove: (id: string) => void }>({
  update: () => {}, remove: () => {},
});
function useNodeActions() { return useContext(NodeActionsCtx); }

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

function Palette({ onAdd }: { onAdd: (kind: NodeKind) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ "Entry Points": true, "Messages & Replies": true });
  const router = useRouter();

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
      <button onClick={() => router.push("/channels/whatsapp/chatbot")} className="flex items-center gap-1.5 px-4 pt-4 text-xs font-semibold text-gray-500 hover:text-gray-900">
        <ChevronLeft className="size-3.5" /> Back to chatbots
      </button>
      <div className="px-4 pb-3 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Component Library</p>
        <h2 className="mt-0.5 text-lg font-bold">Node Palette</h2>
        <p className="mt-0.5 text-xs text-gray-400">Build your flow by dragging elements</p>
      </div>
      <div className="space-y-2 px-3 pb-6">
        {GROUPS.map((g) => {
          const isOpen = open[g.label] ?? false;
          return (
            <div key={g.label}>
              <button
                onClick={() => setOpen((m) => ({ ...m, [g.label]: !isOpen }))}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-gray-50">
                <ChevronDown className={`size-3.5 text-gray-400 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600">{g.label}</span>
                {g.badge && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">{g.badge}</span>}
                <span className="ml-auto text-[10px] text-gray-400">{g.kinds.length}</span>
              </button>
              {isOpen && (
                <div className="mt-1 space-y-1.5">
                  {g.kinds.map((k) => {
                    const spec = SPECS[k];
                    const Icon = spec.icon;
                    return (
                      <div
                        key={k}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData("application/vfv-node", k); e.dataTransfer.effectAllowed = "move"; }}
                        onClick={() => onAdd(k)}
                        className="group flex cursor-grab items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-2.5 py-2 shadow-sm hover:border-lime active:cursor-grabbing">
                        <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${TONES[spec.tone as keyof typeof TONES]} text-white`}>
                          <Icon className="size-3.5" />
                        </span>
                        <span className="text-xs font-semibold text-gray-700">{spec.label}</span>
                        <span className="ml-auto flex flex-col items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="flex flex-col gap-0.5">
                            <span className="h-0.5 w-3 rounded-full bg-gray-300" /><span className="h-0.5 w-3 rounded-full bg-gray-300" />
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

function Canvas({ botId }: { botId: string }) {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState<VfvNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState("");
  const [version, setVersion] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [interactive, setInteractive] = useState(true);
  const dropCounter = useRef(0);
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();

  useEffect(() => {
    fetch(`/api/wa/bots/${botId}/flow`).then((r) => r.json()).then((j) => {
      // Stored nodes carry the semantic type ("trigger", "sendMsg"…) on the node
      // itself; the canvas renders one generic card, so fold it into data.kind.
      const stored = (j.data?.nodes ?? []) as Array<Node & { data?: VfvData }>;
      const normalized = stored.map((n) => ({
        id: n.id,
        type: "vfv",
        position: n.position ?? { x: 0, y: 0 },
        data: { kind: (n.data?.kind as string) ?? n.type, ...(n.data ?? {}) },
      })) as VfvNode[];
      setNodes(normalized);
      setEdges((j.data?.edges ?? []) as Edge[]);
      setName(j.data?.name ?? "Untitled flow");
      setVersion(j.data?.version ?? 1);
      setLoaded(true);
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId]);

  const update = useCallback((id: string, patch: VfvData) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, [setNodes]);

  const remove = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  const actions = useMemo(() => ({ update, remove }), [update, remove]);

  const nodeTypes = useMemo(() => ({ vfv: NodeCard }), []);

  const onConnect = useCallback((c: Connection) => {
    setEdges((eds) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
  }, [setEdges]);

  function addNode(kind: NodeKind, at?: { x: number; y: number }) {
    dropCounter.current += 1;
    const id = `${kind}_${Date.now().toString(36)}_${dropCounter.current}`;
    const pos = at ?? { x: 140 + (nodes.length % 4) * 60, y: 140 + Math.floor(nodes.length / 4) * 80 + (nodes.length % 3) * 50 };
    setNodes((nds) => [...nds, { id, type: "vfv", position: pos, data: { kind, ...defaultsFor(kind) } } as VfvNode]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/vfv-node") as NodeKind;
    if (!kind || !SPECS[kind]) return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addNode(kind, pos);
  }

  async function publish() {
    setSaving(true);
    // Strip React Flow internals the API doesn't need; keep kind inside data.
    const payload = {
      name,
      nodes: nodes.map((n) => ({ id: n.id, type: (n.data as VfvData).kind ?? n.type, position: n.position, data: n.data })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    const j = await fetch(`/api/wa/bots/${botId}/flow`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }).then((r) => r.json());
    if (j.data?.version) setVersion(j.data.version);
    setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    setSaving(false);
  }

  if (!loaded) return <div className="grid flex-1 place-items-center text-sm text-gray-400">Loading flow…</div>;

  return (
    <NodeActionsCtx.Provider value={actions}>
      <div className="flex min-h-0 flex-1">
        <Palette onAdd={(k) => addNode(k)} />
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* flow name bar */}
          <div className="z-10 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-5 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Flow Name</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Untitled flow"
                className="h-8 w-56 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-lime"
              />
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">v{version}</span>
            <button onClick={publish} disabled={saving}
              className="ml-auto flex h-9 items-center gap-2 rounded-xl bg-lime px-4 text-sm font-bold text-forest-950 hover:bg-lime-hover disabled:opacity-50">
              <Save className="size-4" /> {saving ? "Publishing…" : "Save & Publish"}
            </button>
            {savedAt && <span className="text-[11px] font-medium text-emerald-600">Saved {savedAt}</span>}
          </div>

          <div className="min-h-0 flex-1" onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodesDraggable={interactive}
              nodesConnectable={interactive}
              elementsSelectable
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
              {/* control panel */}
              <div className="absolute bottom-4 left-4 z-10 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                <button onClick={() => zoomIn({ duration: 150 })} aria-label="Zoom In" className="grid size-9 place-items-center text-gray-500 hover:bg-gray-50 hover:text-gray-900">
                  <ZoomIn className="size-4" />
                </button>
                <button onClick={() => zoomOut({ duration: 150 })} aria-label="Zoom Out" className="grid size-9 place-items-center border-y border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-gray-900">
                  <ZoomOut className="size-4" />
                </button>
                <button onClick={() => fitView({ padding: 0.2, duration: 250 })} aria-label="Fit View" className="grid size-9 place-items-center border-b border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-gray-900">
                  <Maximize2 className="size-4" />
                </button>
                <button onClick={() => setInteractive((v) => !v)} aria-label="Toggle Interactivity"
                  className={`grid size-9 place-items-center ${interactive ? "text-gray-500 hover:bg-gray-50" : "bg-forest-950 text-lime"}`}>
                  {interactive ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                </button>
              </div>
            </ReactFlow>
          </div>
        </div>
      </div>
    </NodeActionsCtx.Provider>
  );
}

export default function FlowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0">
      <ReactFlowProvider>
        <Canvas botId={id} />
      </ReactFlowProvider>
    </div>
  );
}
