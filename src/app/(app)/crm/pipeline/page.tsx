"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
} from "@dnd-kit/core";
import { Search, Plus, Inbox as InboxIcon, ChevronRight } from "lucide-react";
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
};

const PAGE_SIZE = 40;

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

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

  async function onDragEnd(e: DragEndEvent) {
    const leadId = String(e.active.id);
    const col = e.over?.id ? String(e.over.id) : null;
    if (!col) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === col) return;
    // optimistic
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: col } : l)));
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, status: col }),
    });
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
              <Column key={stage.key} stage={stage} count={items.length}>
                {items.map((l) => (
                  <LeadCard key={l.id} lead={l} />
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

function Column({
  stage, count, children,
}: { stage: (typeof STAGES)[number]; count: number; children: React.ReactNode }) {
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
      <div className="scroll-thin max-h-[60vh] flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">{children}</div>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      data-lead={lead.id}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`cursor-grab touch-none rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-card-hover active:cursor-grabbing ${
        isDragging ? "z-10 opacity-60 ring-2 ring-lime" : ""
      }`}
    >
      <p className="truncate text-sm font-semibold">{lead.fullName}</p>
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
        <Link
          href={`/crm/customers/${lead.customerId}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 text-xs font-semibold text-forest-900 hover:underline"
        >
          View <ChevronRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", businessName: "", stage: "new" });
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
          <h2 className="text-lg font-bold">Add New Customer</h2>
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
