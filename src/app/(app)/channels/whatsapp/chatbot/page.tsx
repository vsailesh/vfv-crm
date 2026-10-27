"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, X, Pencil, Star, Table2 } from "lucide-react";
import { Card, PrimaryButton } from "@/components/ui";

type Bot = {
  id: string; name: string; version: number;
  isActive: number; isDefault: number;
  sessions: number; completed: number; dropoffs: number;
  createdAt: string;
};
type Session = { id: string; phone: string; status: string; startedAt: string };
type Response_ = { id: string; phone: string; nodeLabel: string; answer: string; createdAt: string };

export default function WaChatbotPage() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Bot | null>(null);
  const [sessions, setSessions] = useState<{ bot: Bot; rows: Session[] } | null>(null);
  const [responses, setResponses] = useState<{ bot: Bot; rows: Response_[] } | null>(null);

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

  // Create Chatbot drops straight into the builder with an untitled flow.
  async function createBot() {
    if (busy) return;
    setBusy(true);
    const j = await fetch("/api/wa/bots", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json());
    setBusy(false);
    if (j.data?.id) router.push(`/channels/whatsapp/chatbot/${j.data.id}`);
  }

  async function remove() {
    if (!confirmDel) return;
    await fetch(`/api/wa/bots/${confirmDel.id}`, { method: "DELETE" });
    setConfirmDel(null);
    load();
  }

  async function openSessions(bot: Bot) {
    const j = await fetch(`/api/wa/bots/${bot.id}/sessions`).then((r) => r.json());
    setSessions({ bot, rows: j.data?.data ?? [] });
  }

  async function openResponses(bot: Bot) {
    const j = await fetch(`/api/wa/bots/${bot.id}/responses`).then((r) => r.json());
    setResponses({ bot, rows: j.data?.data ?? [] });
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
        <PrimaryButton onClick={() => { void createBot(); }}><Plus className="size-4" /> {busy ? "Creating…" : "Create Chatbot"}</PrimaryButton>
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
                <button onClick={() => router.push(`/channels/whatsapp/chatbot/${b.id}`)}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-4 text-xs font-semibold hover:bg-gray-50">
                  <Pencil className="size-3" /> Edit flow
                </button>
                <button onClick={() => openSessions(b)} className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-4 text-xs font-semibold hover:bg-gray-50">
                  Sessions
                </button>
                <button onClick={() => openResponses(b)} className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-4 text-xs font-semibold hover:bg-gray-50">
                  <Table2 className="size-3" /> Responses
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

      {sessions && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setSessions(null)}>
          <div className="flex max-h-[70vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-bold">{sessions.bot.name} — Session Analytics</h2>
              <button onClick={() => setSessions(null)} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                <X className="size-4" />
              </button>
            </div>
            {sessions.rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-400">No sessions captured yet. Activate the bot and let it greet someone.</p>
            ) : (
              <div className="divide-y divide-gray-100 overflow-y-auto">
                {sessions.rows.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3">
                    <span className="font-mono text-sm font-semibold">+{s.phone}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${s.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                      {s.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(s.startedAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {responses && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setResponses(null)}>
          <div className="flex max-h-[70vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-bold">{responses.bot.name} — Responses</h2>
              <button onClick={() => setResponses(null)} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                <X className="size-4" />
              </button>
            </div>
            {responses.rows.length === 0 ? (
              <div className="grid place-items-center gap-2 px-5 py-12 text-center">
                <Table2 className="size-8 text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">No responses captured yet</p>
                <p className="text-xs text-gray-400">Add a Store Response In field to a node and collect a reply.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 overflow-y-auto">
                {responses.rows.map((r) => (
                  <div key={r.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold">+{r.phone}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(r.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-gray-600">{r.nodeLabel}</p>
                    <p className="mt-0.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm">{r.answer}</p>
                  </div>
                ))}
              </div>
            )}
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
