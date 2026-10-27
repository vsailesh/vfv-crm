"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, MessageCircle, Phone, Filter, Send } from "lucide-react";
import { STAGES } from "@/lib/stages";
import { Badge } from "@/components/ui";

type Conv = {
  id: string; channel: string; lastMessageAt: string; lastSnippet: string | null; unseen: number;
  customerId: string; name: string; phone: string; customerStatus: string; leadStage: string | null;
  staffName: string | null;
};
type Msg = { id: string; fromCustomer: number; body: string; sentAt: string };

const PASTELS = ["bg-teal-100 text-teal-700", "bg-sky-100 text-sky-700", "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700"];

export default function InboxPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [channel, setChannel] = useState<"whatsapp" | "manual">("whatsapp");
  const [stage, setStage] = useState("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/conversations?channel=${channel}&stage=${stage}${q ? `&q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setConvs(json.data.data);
  }, [channel, stage, q]);

  useEffect(() => { load(); }, [load]);

  // load thread + mark read when a chat is opened
  useEffect(() => {
    if (!sel) { setThread([]); return; }
    let live = true;
    fetch(`/api/conversations/${sel}`).then((r) => r.json()).then((j) => {
      if (!live) return;
      setThread(j.data.messages);
      setConvs((cs) => cs.map((c) => (c.id === sel ? { ...c, unseen: 0 } : c)));
    });
    return () => { live = false; };
  }, [sel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread]);

  const selected = convs.find((c) => c.id === sel);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) + ", " +
    new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  async function send() {
    if (!sel || !draft.trim() || sending) return;
    const body = draft.trim();
    setDraft("");
    setSending(true);
    // optimistic
    setThread((t) => [...t, { id: `tmp_${Date.now()}`, fromCustomer: 0, body, sentAt: new Date().toISOString() }]);
    const res = await fetch(`/api/conversations/${sel}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSending(false);
    if (res.ok) {
      const json = await res.json();
      setThread((t) => t.map((m) => (m.id.startsWith("tmp_") ? json.data : m)));
      setConvs((cs) => cs.map((c) => (c.id === sel ? { ...c, lastSnippet: body.slice(0, 80), lastMessageAt: json.data.sentAt } : c)));
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* pipeline filter bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-3">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
          <Filter className="size-3.5" /> Pipeline
        </span>
        <div className="scroll-thin flex items-center gap-2 overflow-x-auto">
          <Pill active={stage === "all"} onClick={() => setStage("all")}>All</Pill>
          {STAGES.map((s) => <Pill key={s.key} active={stage === s.key} onClick={() => setStage(s.key)}>{s.label}</Pill>)}
          <Pill active={stage === "blocked"} onClick={() => setStage("blocked")}>Blocked</Pill>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* list column */}
        <div className="scroll-thin flex w-[400px] shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
          <div className="space-y-3 px-5 pt-5">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1">
              {(["whatsapp", "manual"] as const).map((ch) => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold capitalize transition-colors ${
                    channel === ch ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-800"
                  }`}>
                  {ch === "whatsapp" ? <MessageCircle className="size-4 text-emerald-500" /> : <Phone className="size-4 text-gray-400" />}
                  {ch}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats"
                className="w-full rounded-full bg-gray-100 py-2.5 pl-10 pr-4 text-sm outline-none" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Unified Inbox <span className="text-sm font-normal text-gray-500">(Showing {convs.length})</span>
              </h1>
              <p className="text-sm text-gray-500">Real-time conversations</p>
            </div>
          </div>

          <div className="mt-2 divide-y divide-gray-100">
            {convs.map((c, i) => (
              <button key={c.id} onClick={() => setSel(c.id)}
                className={`flex w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 ${sel === c.id ? "border-l-2 border-lime bg-gray-50" : ""}`}>
                <div className="relative shrink-0">
                  <span className={`grid size-12 place-items-center rounded-full text-sm font-bold ${PASTELS[i % PASTELS.length]}`}>
                    {initials(c.name)}
                  </span>
                  {c.channel === "whatsapp" && <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-white">
                    <MessageCircle className="size-3 text-emerald-500" />
                  </span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold">{c.name}</p>
                    <span className="shrink-0 text-xs text-gray-400">{fmt(c.lastMessageAt)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{c.lastSnippet}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {c.leadStage && <Badge variant={c.leadStage}>{c.leadStage.replace("_", " ")}</Badge>}
                    <Badge variant={c.customerStatus}>{c.customerStatus}</Badge>
                    {c.staffName && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">{c.staffName}</span>
                    )}
                  </div>
                </div>
                {c.unseen > 0 && (
                  <span className="grid size-6 shrink-0 place-items-center self-center rounded-full bg-forest-950 text-xs font-bold text-white">
                    {c.unseen}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* detail panel */}
        <div className="flex flex-1 flex-col bg-white">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
                <span className="grid size-10 place-items-center rounded-full bg-gray-100 font-bold">{initials(selected.name)}</span>
                <div>
                  <p className="font-semibold">{selected.name}</p>
                  <p className="text-xs text-gray-500">{selected.phone}</p>
                </div>
                {selected.channel === "whatsapp" && (
                  <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <MessageCircle className="size-3.5" /> WhatsApp
                  </span>
                )}
              </div>
              <div ref={scrollRef} className="scroll-thin flex flex-1 flex-col gap-3 overflow-y-auto p-6">
                {thread.map((m) => (
                  <Bubble key={m.id} fromCustomer={m.fromCustomer === 1} time={fmt(m.sentAt)}>{m.body}</Bubble>
                ))}
              </div>
              <div className="flex items-center gap-3 border-t border-gray-200 p-4">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={selected.channel === "whatsapp" ? "Type a WhatsApp message..." : "Type a message..."}
                  className="h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime"
                />
                <button onClick={send} disabled={!draft.trim() || sending} aria-label="Send message"
                  className="grid size-11 place-items-center rounded-xl bg-forest-950 text-white transition-opacity hover:opacity-90 disabled:opacity-40">
                  <Send className="size-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <div className="grid size-40 place-items-center rounded-full bg-white shadow-lg">
                <MessageCircle className="size-16 text-gray-200" />
              </div>
              <h2 className="mt-6 text-3xl font-bold">No conversation selected</h2>
              <p className="mt-3 max-w-md text-sm text-gray-500">Pick a chat from the left to see the full thread, context and actions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${
        active ? "border-lime bg-lime font-semibold text-gray-900" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}>
      {children}
    </button>
  );
}

function Bubble({ children, fromCustomer, time }: { children: React.ReactNode; fromCustomer?: boolean; time?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${fromCustomer ? "self-start items-start" : "self-end items-end"}`}>
      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${fromCustomer ? "bg-gray-100" : "bg-lime/40"}`}>
        {children}
      </div>
      {time && <span className="px-1 text-[10px] text-gray-400">{time}</span>}
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}
