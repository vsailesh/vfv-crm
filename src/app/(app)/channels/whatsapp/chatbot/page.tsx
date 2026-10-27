"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2, X, Pencil, Star } from "lucide-react";
import { Card, PrimaryButton } from "@/components/ui";

type Bot = {
  id: string; name: string; version: number;
  isActive: number; isDefault: number;
  sessions: number; completed: number; dropoffs: number;
  createdAt: string;
};

export default function WaChatbotPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [q, setQ] = useState("");
  const [create, setCreate] = useState(false);
  const [name, setName] = useState("");
  const [confirmDel, setConfirmDel] = useState<Bot | null>(null);

  const load = useCallback(async () => {
    const json = await fetch("/api/wa/bots").then((r) => r.json());
    setBots(json.data.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(bot: Bot) {
    await fetch(`/api/wa/bots/${bot.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !bot.isActive }),
    });
    load();
  }

  async function makeDefault(bot: Bot) {
    await fetch(`/api/wa/bots/${bot.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    load();
  }

  async function createBot() {
    if (!name.trim()) return;
    await fetch("/api/wa/bots", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setCreate(false);
    load();
  }

  async function remove() {
    if (!confirmDel) return;
    await fetch(`/api/wa/bots/${confirmDel.id}`, { method: "DELETE" });
    setConfirmDel(null);
    load();
  }

  const totalSessions = bots.reduce((a, b) => a + b.sessions, 0);
  const totalCompleted = bots.reduce((a, b) => a + b.completed, 0);
  const totalDrop = bots.reduce((a, b) => a + b.dropoffs, 0);
  const avgCompletion = totalSessions ? ((totalCompleted / totalSessions) * 100).toFixed(1) : "0";

  const shown = bots.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chatbot</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor engagement and performance across all WhatsApp flows</p>
        </div>
        <PrimaryButton onClick={() => setCreate(true)}><Plus className="size-4" /> Create Chatbot</PrimaryButton>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total sessions" value={totalSessions} />
        <Stat label="Avg. completion" value={`${avgCompletion}%`} />
        <Stat label="Total drop-offs" value={totalDrop} />
        <Stat label="Active bots" value={`${bots.filter((b) => b.isActive).length} / ${Math.max(2, bots.length)}`} />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chatbots..."
          className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-lime" />
      </div>

      {shown.length === 0 && (
        <Card className="p-10 text-center text-sm text-gray-400">No chatbots yet. Create one to reply 24/7.</Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {shown.map((b) => {
          const rate = b.sessions ? ((b.completed / b.sessions) * 100).toFixed(1) : "0";
          return (
            <Card key={b.id} className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-teal-50 text-teal-600 font-bold capitalize">
                    {b.name.charAt(0)}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{b.name}</h3>
                    <p className="text-xs text-gray-400">Version {b.version}{b.isDefault ? " · default" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${b.isActive ? "text-emerald-600" : "text-gray-400"}`}>
                    {b.isActive ? "Active" : "Inactive"}
                  </span>
                  {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props */}
                  <button role="switch" aria-checked={!!b.isActive} aria-label={`Activate ${b.name}`}
                    onClick={() => toggle(b)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${b.isActive ? "bg-lime" : "bg-gray-200"}`}>
                    <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${b.isActive ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3">
                <Metric label="Sessions" value={b.sessions} />
                <Metric label="Completed" value={b.completed} />
                <Metric label="Drop-offs" value={b.dropoffs} />
                <Metric label="Completion" value={`${rate}%`} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-4 text-xs font-semibold hover:bg-gray-50">
                  <Pencil className="size-3" /> Edit flow
                </button>
                <button className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-4 text-xs font-semibold hover:bg-gray-50">
                  Sessions
                </button>
                <button className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-4 text-xs font-semibold hover:bg-gray-50">
                  Responses
                </button>
                {!b.isDefault && (
                  <button onClick={() => makeDefault(b)} className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-4 text-xs font-semibold hover:bg-gray-50">
                    <Star className="size-3" /> Set as default
                  </button>
                )}
                <button onClick={() => setConfirmDel(b)} aria-label={`Delete ${b.name}`}
                  className="ml-auto grid size-9 place-items-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {create && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setCreate(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Create Chatbot</h2>
              <button onClick={() => setCreate(false)} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                <X className="size-4" />
              </button>
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. booking_flow" autoFocus
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            <p className="mt-2 text-[11px] text-gray-400">Starts inactive — build the flow, then switch it on.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setCreate(false)} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={createBot} disabled={!name.trim()}
                className="h-10 flex-1 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setConfirmDel(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Delete “{confirmDel.name}”?</h2>
            <p className="mt-2 text-sm text-gray-500">Its flow and session history are removed. Running conversations fall back to the default bot.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={remove} className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
    </div>
  );
}
