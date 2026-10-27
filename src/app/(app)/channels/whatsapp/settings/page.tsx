"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Phone, Building2, SlidersHorizontal, ChevronRight, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui";

export default function WaSettingsPage() {
  const [phone, setPhone] = useState("+91 99645 59178");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((j) => {
      const p = j?.data?.whatsappPhone;
      if (p) setPhone(`+91 ${p.slice(2, 7)} ${p.slice(7)}`);
    }).catch(() => {});
  }, []);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Configure your WhatsApp integration</p>
        </div>
        <span className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Connection status</span>
          <span className="text-sm font-bold text-emerald-600">Live & Connected</span>
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* section switcher */}
        <div className="space-y-1.5">
          {([
            ["Account Status", ShieldCheck, true],
            ["Messaging Limits", SlidersHorizontal, false],
            ["Phone Numbers", Phone, false],
            ["Business Profile", Building2, false],
          ] as const).map(([label, Icon, active]) => (
            <button key={label}
              className={`flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                active ? "bg-forest-950 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
              }`}>
              <Icon className={`size-4 ${active ? "text-lime" : "text-gray-400"}`} /> {label}
              <ChevronRight className={`ml-auto size-4 ${active ? "text-lime" : "text-gray-300"}`} />
            </button>
          ))}
        </div>

        {/* account overview */}
        <Card className="p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Account Overview</h2>
              <p className="mt-0.5 text-sm text-gray-500">Global status and identification for your WABA.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-600">Ready</span>
          </div>

          <div className="mt-6 rounded-2xl bg-forest-950 p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">Veda For Vaidyas</h3>
                <p className="mt-0.5 text-xs text-white/60">Business Account</p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">Approved</span>
            </div>
            <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Field label="WABA ID" value="950192124114129" onCopy={() => copy("950192124114129", "waba")} copied={copied === "waba"} />
              <Field label="Phone number" value={phone} onCopy={() => copy(phone, "phone")} copied={copied === "phone"} />
              <Field label="Registration status" value="Fully Registered" />
              <Field label="WABA phone ID" value="1312534415274530" onCopy={() => copy("1312534415274530", "pid")} copied={copied === "pid"} />
              <Field label="Webhook subscription" value="subscribed" ok />
              <Field label="Contact" value="—" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">WABA</p>
              <p className="mt-1.5 text-lg font-bold text-emerald-600">Approved</p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Quality</p>
              <p className="mt-1.5 text-lg font-bold">N/A</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Rating builds after more sends</p>
            </div>
            <button className="rounded-2xl border border-gray-100 p-5 text-left hover:bg-gray-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Messaging tier</p>
              <p className="mt-1.5 text-lg font-bold">Tier 2K</p>
              <p className="mt-0.5 text-[11px] font-semibold text-lime-600 underline underline-offset-2">See today's usage</p>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onCopy, copied, ok }: { label: string; value: string; onCopy?: () => void; copied?: boolean; ok?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      <p className={`mt-1 flex items-center gap-2 text-sm font-semibold ${ok ? "text-emerald-300" : "text-white"}`}>
        {value}
        {onCopy && (
          <button onClick={onCopy} aria-label={`Copy ${label}`} className="text-white/40 hover:text-lime">
            {copied ? <Check className="size-3.5 text-lime" /> : <Copy className="size-3.5" />}
          </button>
        )}
      </p>
    </div>
  );
}
