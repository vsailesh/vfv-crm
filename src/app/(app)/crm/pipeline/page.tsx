"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
} from "@dnd-kit/core";
import { Search, Plus, Inbox as InboxIcon, ChevronRight, Undo2, X, ListChecks, Check } from "lucide-react";
import { STAGES } from "@/lib/stages";
import { Badge, Card, StatPill } from "@/components/ui";

type Lead = {
  id: string;
  status: string;
  source: string;
  fullName: string;
  phone: string;
  customerStatus: string;
  customerId: string;
  assignedToStaffName: string | null;
  score?: number;
  value?: number;
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0, notation: n >= 100000 ? "compact" : "standard" }).format(n);

const PAGE_SIZE = 40;

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [undo, setUndo] = useState<{ moves: Array<{ leadId: string; from: string }>; to: string; label: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // bulk selection
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTo, setBulkTo] = useState("");

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [undo]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leads?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setLeads(json.data.data);
    setTotal(json.data.meta.total);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const byStage = useMemo(() => {
    const m = new Map<string, Lead[]>();
    for (const s of STAGES) m.set(s.key, []);
    for (const l of leads) {
      if (stageFilter !== "all" && l.status !== stageFilter) continue;
      m.get(l.status)?.push(l);
    }
    return m;
  }, [leads, stageFilter]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function moveLead(leadId: string, to: string) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: to } : l)));
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, status: to }),
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const leadId = String(e.active.id);
    const col = e.over?.id ? String(e.over.id) : null;
    if (!col) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === col) return;
    await moveLead(leadId, col);
    setUndo({ moves: [{ leadId, from: lead.status }], to: col, label: lead.fullName });
  }

  async function moveSelected() {
    if (!bulkTo || selected.size === 0) return;
    const moves = leads
      .filter((l) => selected.has(l.id) && l.status !== bulkTo)
      .map((l) => ({ leadId: l.id, from: l.status }));
    const to = bulkTo;
    setSelected(new Set());
    setBulkTo("");
    if (!moves.length) return;
    await Promise.all(moves.map((m) => moveLead(m.leadId, to)));
    const first = leads.find((l) => l.id === moves[0].leadId);
    setUndo({
      moves, to,
      label: moves.length === 1 ? (first?.fullName ?? "1 lead") : `${moves.length} leads`,
    });
  }

  async function undoMove() {
    if (!undo) return;
    const moves = undo.moves;
    setUndo(null);
    await Promise.all(moves.map((m) => moveLead(m.leadId, m.from)));
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header card */}
      <Card className="space-y-5 p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold tracking-tight">Pipeline Management</h1>
            <p className="mt-2 text-sm text-gray-500">Drag leads between stages — pipeline status updates automatically.</p>
          </div>
          <div className="flex items-center gap-3">
            <StatPill label="Total Leads" value={total} />
            <StatPill label="Pipeline Value" value={inr(leads.reduce((a, l) => a + (l.value ?? 0), 0))} />
            <button
              onClick={() => {
                const next = !selectMode;
                setSelectMode(next);
                if (!next) setSelected(new Set());
                setBulkTo("");
              }}
              className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                selectMode
                  ? "border-forest-950 bg-forest-950 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ListChecks className="size-4" /> {selectMode ? "Done" : "Select"}
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex h-10 items-center gap-2 rounded-xl bg-lime px-5 text-sm font-semibold text-forest-950 hover:bg-lime-hover"
            >
              <Plus className="size-4" /> New Lead
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads by name, phone..."
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime"
          />
        </div>
      </Card>

      {/* Stage filter pills — one row on page background, below the header card */}
      <div className="scroll-thin flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        <FilterPill active={stageFilter === "all"} onClick={() => setStageFilter("all")}>All Stages</FilterPill>
        {STAGES.map((s) => (
          <FilterPill key={s.key} active={stageFilter === s.key} onClick={() => setStageFilter(s.key)}>
            {s.label}
          </FilterPill>
        ))}
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="scroll-thin flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const items = byStage.get(stage.key) ?? [];
            return (
              <Column key={stage.key} stage={stage} count={items.length} value={items.reduce((a, l) => a + (l.value ?? 0), 0)}>
                {items.map((l) => (
                  <LeadCard key={l.id} lead={l} selectMode={selectMode} isSelected={selected.has(l.id)} onToggleSelect={() => toggleSelect(l.id)} />
                ))}
                {items.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <InboxIcon className="size-8 text-gray-200" />
                    <p className="text-xs text-gray-400">Drop leads here</p>
                  </div>
                )}
                {items.length >= PAGE_SIZE && (
                  <p className="py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-gray-300">
                    Scroll for more
                  </p>
                )}
              </Column>
            );
          })}
        </div>
      </DndContext>

      {/* bulk selection action bar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-forest-950 px-5 py-3 text-sm text-white shadow-xl">
            <span className="font-semibold">{selected.size} selected</span>
            <select
              value={bulkTo}
              onChange={(e) => setBulkTo(e.target.value)}
              className="h-9 rounded-lg border border-white/20 bg-white/10 px-2 text-xs font-semibold text-white outline-none"
            >
              <option value="" className="bg-white text-gray-900">Move to…</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key} className="bg-white text-gray-900">{s.label}</option>
              ))}
            </select>
            <button
              onClick={moveSelected}
              disabled={!bulkTo}
              className="h-9 rounded-lg bg-lime px-4 text-xs font-bold text-forest-950 hover:bg-lime-hover disabled:opacity-40"
            >
              Move
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-gray-400 hover:text-white">
              Clear
            </button>
          </div>
        </div>
      )}

      {undo && (
        <div className={`fixed left-1/2 z-50 -translate-x-1/2 ${selectMode && selected.size > 0 ? "bottom-24" : "bottom-6"}`}>
          <div className="flex items-center gap-4 rounded-2xl bg-forest-950 px-5 py-3 text-sm text-white shadow-xl">
            <span>
              Moved <strong>{undo.label}</strong> to{" "}
              <strong>{STAGES.find((s) => s.key === undo.to)?.label ?? undo.to}</strong>
            </span>
            <button
              onClick={undoMove}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-lime px-3 text-xs font-bold text-forest-950 hover:bg-lime-hover"
            >
              <Undo2 className="size-3.5" /> Undo
            </button>
            <button onClick={() => setUndo(null)} className="text-gray-400 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {showNew && <NewLeadModal onClose={() => setShowNew(false)} onCreated={load} />}
      {loading && <p className="sr-only">Loading…</p>}
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full px-3.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
        active ? "bg-forest-950 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function ScoreChip({ score }: { score: number }) {
  const tone =
    score >= 70
      ? "bg-emerald-50 text-emerald-700"
      : score >= 40
        ? "bg-amber-50 text-amber-700"
        : "bg-gray-100 text-gray-500";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${tone}`} title={`Lead score ${score}/100`}>
      {score}
    </span>
  );
}

function Column({
  stage, count, value, children,
}: { stage: (typeof STAGES)[number]; count: number; value: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  return (
    <div
      ref={setNodeRef}
      data-stage={stage.key}
      className={`flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-card ${
        isOver ? "border-lime ring-2 ring-lime" : "border-gray-100"
      }`}
    >
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${stage.fill}, ${stage.fill}88)` }} />
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: stage.fill }} />
          <span className="text-sm font-semibold">{stage.label}</span>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">{count}</span>
      </div>
      {value > 0 && (
        <p className="-mt-1 px-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">{inr(value)} in play</p>
      )}
      <div className="scroll-thin max-h-[60vh] flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">{children}</div>
    </div>
  );
}

function LeadCard({ lead, selectMode, isSelected, onToggleSelect }: {
  lead: Lead; selectMode: boolean; isSelected: boolean; onToggleSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      data-lead={lead.id}
      {...attributes}
      {...listeners}
      onClick={selectMode ? onToggleSelect : undefined}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`touch-none rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-card-hover ${
        selectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${
        isSelected ? "border-forest-950 ring-2 ring-forest-950" : "border-gray-100 bg-white"
      } ${isDragging ? "z-10 opacity-60 ring-2 ring-lime" : ""}`}
    >
      {selectMode && (
        <span className={`mb-2 grid size-5 place-items-center rounded-md border ${
          isSelected ? "border-forest-950 bg-forest-950 text-white" : "border-gray-300 bg-white text-transparent"
        }`}>
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold">{lead.fullName}</p>
        {typeof lead.score === "number" && <ScoreChip score={lead.score} />}
      </div>
      <p className="mt-0.5 text-xs text-gray-500">+91 {lead.phone}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant={lead.source}>{lead.source}</Badge>
        {lead.status === "converted" ? (
          <Badge variant="converted">won</Badge>
        ) : lead.status === "lost" ? (
          <Badge variant="lost">lost</Badge>
        ) : (
          <Badge variant={lead.customerStatus}>{lead.customerStatus}</Badge>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {lead.assignedToStaffName ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{lead.assignedToStaffName}</span>
        ) : <span />}
        <span className="flex items-center gap-2">
          {typeof lead.value === "number" && lead.value > 0 && (
            <span className="text-xs font-bold text-forest-900">{inr(lead.value)}</span>
          )}
        <Link
          href={`/crm/customers/${lead.customerId}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 text-xs font-semibold text-forest-900 hover:underline"
        >
          View <ChevronRight className="size-3" />
        </Link>
        </span>
      </div>
    </div>
  );
}

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", businessName: "", stage: "new", value: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.name || !form.phone) return;
    setBusy(true);
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, source: "manual" }),
    });
    setBusy(false);
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add New Lead</h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-700">×</button>
        </div>
        <div className="space-y-3 text-sm">
          <Field label="Name *" value={form.name} onChange={set("name")} placeholder="Name" />
          <Field label="Phone *" value={form.phone} onChange={set("phone")} placeholder="9876543210" />
          <Field label="Email" value={form.email} onChange={set("email")} placeholder="email@example.com" />
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Address</label>
            <textarea value={form.address} onChange={set("address")} placeholder="Street address, landmark..." rows={2}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" value={form.city} onChange={set("city")} placeholder="City" />
            <Field label="State" value={form.state} onChange={set("state")} placeholder="State" />
          </div>
          <Field label="Pincode" value={form.pincode} onChange={set("pincode")} placeholder="Pincode" />
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Pipeline</label>
            <select value={form.stage} onChange={set("stage")}
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 outline-none focus:bg-white focus:ring-2 focus:ring-lime">
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <Field label="Deal value (₹)" value={form.value} onChange={set("value")} placeholder="e.g. 25000" />
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="h-10 flex-1 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <input value={value} onChange={onChange} placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
    </div>
  );
}
