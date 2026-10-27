"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Plus, Search, Copy, Check, Pencil, Pause, Play, Trash2, X,
  Link2, Target, ChevronDown, RefreshCw,
} from "lucide-react";
import { Card, PrimaryButton } from "@/components/ui";

type Qr = {
  id: string; code: string; name: string;
  redirectType: "custom_url" | "google_review" | "whatsapp";
  destinationUrl: string; prefillMessage: string | null; autoResponse: string | null;
  utmSource: string | null; utmMedium: string | null; utmCampaign: string | null;
  campaignTag: string | null; status: "live" | "paused";
  scans: number; newScans: number; existingScans: number;
  lastScanAt: string | null; createdAt: string;
};

const TYPES = [
  { key: "custom_url", label: "Custom URL" },
  { key: "google_review", label: "Google Review" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;

export default function QrStudioPage() {
  const [rows, setRows] = useState<Qr[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "live" | "paused">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; qr: Qr } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Qr | null>(null);

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ status });
    if (q) sp.set("q", q);
    const json = await fetch(`/api/qr?${sp}`).then((r) => r.json());
    setRows(json.data.data);
  }, [q, status]);

  useEffect(() => { load(); }, [load]);

  function shortUrl(qr: Qr) {
    return `${window.location.origin}/r/${qr.code}`;
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  async function flip(qr: Qr) {
    await fetch(`/api/qr/${qr.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: qr.status === "live" ? "paused" : "live" }),
    });
    load();
  }

  async function remove() {
    if (!confirmDel) return;
    await fetch(`/api/qr/${confirmDel.id}`, { method: "DELETE" });
    setConfirmDel(null);
    load();
  }

  const totalScans = rows.reduce((a, r) => a + r.scans, 0);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Card className="flex flex-wrap items-start justify-between gap-6 p-7">
        <div className="max-w-lg">
          <h1 className="text-3xl font-bold tracking-tight">QR Studio</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Generate, manage, and monitor your business QR codes with scan attribution and lead tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total scans</span>
            <span className="text-lg font-bold">{totalScans}</span>
          </span>
          <PrimaryButton onClick={() => setModal({ mode: "create" })}>
            <Plus className="size-4" /> Create QR Code
          </PrimaryButton>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, campaign..."
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-lime" />
        </div>
        <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
          {(["all", "live", "paused"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                status === s ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={load} aria-label="Refresh list"
          className="grid size-11 place-items-center rounded-2xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800">
          <RefreshCw className="size-4" />
        </button>
      </div>

      {rows.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-sm text-gray-400">No QR codes yet. Create your first trackable code.</p>
        </Card>
      )}

      <div className="space-y-4">
        {rows.map((qr) => (
          <QrCard key={qr.id} qr={qr} onCopy={copy} copied={copied === qr.id} onFlip={() => flip(qr)}
            onEdit={() => setModal({ mode: "edit", qr })} onDelete={() => setConfirmDel(qr)} />
        ))}
      </div>

      {modal && (
        <QrModal
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setConfirmDel(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Delete “{confirmDel.name}”?</h2>
            <p className="mt-2 text-sm text-gray-500">
              The short URL <span className="font-mono text-xs">/r/{confirmDel.code}</span> stops working immediately. Scan history is lost.
            </p>
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

function QrCard({ qr, onCopy, copied, onFlip, onEdit, onDelete }: {
  qr: Qr;
  onCopy: (text: string, key: string) => void;
  copied: boolean;
  onFlip: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const short = typeof window !== "undefined" ? `${window.location.origin}/r/${qr.code}` : `/r/${qr.code}`;

  useEffect(() => {
    QRCode.toDataURL(short, { width: 160, margin: 1, color: { dark: "#0c1f16", light: "#ffffff" } }).then(setDataUrl);
  }, [short]);

  return (
    <Card className="flex flex-wrap items-center gap-6 p-6">
      {/* left: identity */}
      <div className="min-w-56 flex-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            qr.status === "live" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
          }`}>{qr.status}</span>
          <span className="rounded-full bg-lime/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-forest-900">
            {TYPES.find((t) => t.key === qr.redirectType)?.label ?? qr.redirectType}
          </span>
        </div>
        <h3 className="mt-2 text-lg font-bold">{qr.name}</h3>
        <p className="mt-0.5 text-xs text-gray-400">ID: <span className="font-mono font-semibold uppercase">{qr.code}</span></p>
        <div className="mt-2 flex items-center gap-1.5">
          <a href={`/r/${qr.code}`} target="_blank" rel="noreferrer"
            className="max-w-64 truncate text-xs text-gray-500 underline decoration-gray-300 underline-offset-2 hover:text-gray-800">
            {short}
          </a>
          <button onClick={() => onCopy(short, qr.id)} aria-label="Copy short URL"
            className="grid size-6 place-items-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* middle: stats */}
      <div className="flex items-center gap-8">
        {([["SCANS", qr.scans], ["NEW", qr.newScans], ["EXISTING", qr.existingScans]] as const).map(([label, v]) => (
          <div key={label} className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="mt-0.5 text-xl font-bold">{v}</p>
          </div>
        ))}
        <div className="min-w-28">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Campaign tag</p>
          <p className="mt-0.5 truncate text-sm font-semibold">{qr.campaignTag ?? "—"}</p>
        </div>
        <div className="min-w-36">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Last scanned</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600">
            {qr.lastScanAt
              ? new Date(qr.lastScanAt).toLocaleString("en-IN", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
              : "Never"}
          </p>
        </div>
      </div>

      {/* right: QR + actions */}
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
          {dataUrl ? <img src={dataUrl} alt={`QR for ${qr.name}`} className="size-24" /> : <div className="size-24 animate-pulse rounded-lg bg-gray-100" />}
        </div>
        <div className="flex flex-col gap-1.5">
          <button onClick={onEdit} className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold hover:bg-gray-50">
            <Pencil className="size-3" /> Edit
          </button>
          <button onClick={onFlip} className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold hover:bg-gray-50">
            {qr.status === "live" ? <><Pause className="size-3" /> Pause</> : <><Play className="size-3" /> Resume</>}
          </button>
          <button onClick={onDelete} className="flex h-8 items-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 hover:bg-red-50">
            <Trash2 className="size-3" /> Delete
          </button>
        </div>
      </div>
    </Card>
  );
}

function QrModal({ mode, onClose, onSaved }: {
  mode: { mode: "create" } | { mode: "edit"; qr: Qr };
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = mode.mode === "edit" ? mode.qr : null;
  const [type, setType] = useState<Qr["redirectType"]>(editing?.redirectType ?? "custom_url");
  const [name, setName] = useState(editing?.name ?? "");
  const [dest, setDest] = useState(editing?.destinationUrl ?? "");
  const [prefill, setPrefill] = useState(editing?.prefillMessage ?? "");
  const [autoResp, setAutoResp] = useState(editing?.autoResponse ?? "");
  const [tag, setTag] = useState(editing?.campaignTag ?? "");
  const [utmOpen, setUtmOpen] = useState(false);
  const [utmSource, setUtmSource] = useState(editing?.utmSource ?? "qr");
  const [utmMedium, setUtmMedium] = useState(editing?.utmMedium ?? "qr");
  const [utmCampaign, setUtmCampaign] = useState(editing?.utmCampaign ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const waPhone = "919964559178";
  const previewUrl = useMemo(() => {
    if (type === "whatsapp") {
      const text = prefill.trim() ? `?text=${encodeURIComponent(prefill.trim())}` : "";
      return `https://wa.me/${waPhone}${text}`;
    }
    return dest || "https://";
  }, [type, dest, prefill]);

  const previewShort = editing ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${editing.code}` : "…generated on save";

  const [previewImg, setPreviewImg] = useState("");
  useEffect(() => {
    if (editing) QRCode.toDataURL(previewShort, { width: 120, margin: 1, color: { dark: "#0c1f16", light: "#ffffff" } }).then(setPreviewImg);
    else setPreviewImg("");
  }, [previewShort, editing]);

  async function save() {
    setBusy(true); setErr("");
    const body = { name, redirectType: type, destinationUrl: type === "whatsapp" ? undefined : dest, prefillMessage: prefill || undefined, autoResponse: autoResp || undefined, campaignTag: tag || undefined, utmSource: utmSource || undefined, utmMedium: utmMedium || undefined, utmCampaign: utmCampaign || undefined };
    const res = editing
      ? await fetch(`/api/qr/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, destinationUrl: type === "whatsapp" ? undefined : dest, campaignTag: tag }) })
      : await fetch("/api/qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) onSaved();
    else setErr((await res.json().catch(() => ({}))).message ?? "Save failed");
  }

  const valid = name.trim() && (type === "whatsapp" || dest.trim());

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-lg rounded-3xl bg-white p-7 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{editing ? "Edit QR Code" : "Create QR Code"}</h2>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Set up a new trackable link</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Redirect type <span className="text-red-500">*</span></label>
            <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
              {TYPES.map((t) => (
                <button key={t.key} onClick={() => setType(t.key)} disabled={!!editing}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    type === t.key ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-800 disabled:hover:text-gray-400"
                  } ${editing ? "opacity-60" : ""}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {editing && <p className="mt-1 text-[11px] text-gray-400">Redirect type can’t change after creation.</p>}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">QR name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Counter Card QR" autoFocus={!editing}
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
          </div>

          {type === "custom_url" && (
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Redirect URL</label>
              <div className="relative">
                <Link2 className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="https://yourpage.com/offer"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
              </div>
            </div>
          )}

          {type === "google_review" && (
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Google review link</label>
              <div className="relative">
                <Link2 className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="https://g.page/r/YourBusinessId/review"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">Find it in your Google Business Profile → “Ask for reviews”.</p>
            </div>
          )}

          {type === "whatsapp" && (
            <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">WhatsApp direct message</p>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Destination link</label>
                <input readOnly value={previewUrl} className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-500 outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Pre-filled message (optional)</label>
                <textarea value={prefill} onChange={(e) => setPrefill(e.target.value)} rows={2}
                  placeholder="Hi, I scanned your QR code and would like to know more!"
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-lime" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Automated response (optional)</label>
                <textarea value={autoResp} onChange={(e) => setAutoResp(e.target.value)} rows={2}
                  placeholder="Thanks for reaching out! Our team will assist you shortly."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-lime" />
                <p className="mt-1 text-[11px] text-gray-400">If set, sent once when someone messages you after scanning this QR.</p>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Campaign tag (optional)</label>
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. diwali-2026"
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
          </div>

          {/* UTM collapsible */}
          <button onClick={() => setUtmOpen(!utmOpen)}
            className="flex w-full items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100">
            <Target className="size-3.5" /> Advanced meta tags (UTM)
            <ChevronDown className={`ml-auto size-4 transition-transform ${utmOpen ? "rotate-180" : ""}`} />
          </button>
          {utmOpen && (
            <div className="grid grid-cols-3 gap-2">
              {([["Source", utmSource, setUtmSource, "qr"], ["Medium", utmMedium, setUtmMedium, "qr"], ["Campaign", utmCampaign, setUtmCampaign, "diwali"]] as const).map(([label, val, set, ph]) => (
                <div key={label}>
                  <label className="mb-1 block text-[10px] font-semibold text-gray-500">utm_{label.toLowerCase()}</label>
                  <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
                </div>
              ))}
            </div>
          )}

          {/* live preview */}
          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            {previewImg
              ? <img src={previewImg} alt="QR preview" className="size-24 rounded-lg border border-gray-200 bg-white p-1" />
              : <div className="grid size-24 place-items-center rounded-lg border border-dashed border-gray-300 bg-white text-[10px] text-gray-400">on save</div>}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Live preview</p>
              <p className="mt-1 truncate text-sm font-bold">{name.trim() || "Untitled QR"}</p>
              <p className="truncate text-xs text-gray-400">{type === "whatsapp" ? previewUrl : previewShort}</p>
              {type !== "whatsapp" && dest && (
                <p className="mt-1 truncate text-[11px] text-gray-400">→ {dest}</p>
              )}
            </div>
          </div>
        </div>

        {err && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{err}</p>}

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Discard</button>
          <button onClick={save} disabled={!valid || busy}
            className="h-11 flex-1 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">
            {busy ? "Saving…" : editing ? "Save changes" : "Generate QR Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
