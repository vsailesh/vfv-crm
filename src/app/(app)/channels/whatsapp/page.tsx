"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sprout, ChevronRight, Headphones, CalendarClock, MessageCircle, FileText, BarChart3, Bot, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui";

export default function WaOverviewPage() {
  const [me, setMe] = useState<{ name: string } | null>(null);
  const [phone, setPhone] = useState("+91 99645 59178");
  const [templatesLive, setTemplatesLive] = useState(0);
  const [queue, setQueue] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => setMe(j.data)).catch(() => {});
    fetch("/api/settings").then((r) => r.json()).then((j) => {
      const p = j?.data?.whatsappPhone;
      if (p) setPhone(`+91 ${p.slice(2, 7)} ${p.slice(7)}`);
    }).catch(() => {});
    fetch("/api/wa/templates?status=approved").then((r) => r.json()).then((j) => setTemplatesLive(j.data.data.length)).catch(() => {});
    fetch("/api/campaigns").then((r) => r.json()).then((j) => setQueue(j.data.data.filter((c: { status: string }) => c.status === "queued").length)).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = (me?.name ?? "there").split(" ")[0];

  return (
    <div className="p-6 lg:p-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{greet}, {first}!</h1>
            <p className="mt-2 text-sm text-gray-500">Here's what's happening with your WhatsApp playground.</p>
          </div>

          {/* daily mission */}
          <div className="relative overflow-hidden rounded-3xl bg-forest-950 p-7 text-white">
            <div className="absolute -right-20 -top-24 size-64 rounded-full bg-lime/10 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">Daily mission · Level 1</p>
              <span className="flex items-center gap-1.5 rounded-full bg-lime px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-forest-950">
                <Sprout className="size-3.5" /> Sprout
              </span>
            </div>
            <h2 className="relative mt-3 text-2xl font-bold">Today's quest: hit 2,000.</h2>
            <p className="relative mt-1 text-sm text-white/60">Just getting started — every send teaches Meta you're legit.</p>
            <div className="relative mt-5 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-amber-300">0</span>
              <span className="text-sm text-white/50">/ 2,000</span>
            </div>
            <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[2%] rounded-full bg-lime" />
            </div>
            <div className="relative mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-white/50">0% today · 2,000 to go — time to wake up that audience? ☕</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-lime">● Quality Green</span>
                <button className="flex items-center gap-1 rounded-full bg-lime px-3 py-1 text-[11px] font-bold text-forest-950">
                  View tier ladder <ChevronRight className="size-3" />
                </button>
              </div>
            </div>
            <p className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70">
              🌿 Next unlock: 10k / day
            </p>
          </div>

          {/* status cards — 2 + 3 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <StatusCard eyebrow="Library" title="Templates" status="Active" ok
              desc={`${templatesLive} live · all clear`} href="/channels/whatsapp/templates" Icon={FileText} tone="rose" />
            <StatusCard eyebrow="Outreach" title="Campaign Analytics" status="Live data" ok
              desc="3.1% delivery · launches in range" href="/channels/whatsapp/campaigns" Icon={BarChart3} tone="violet" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatusCard eyebrow="Queue" title="Scheduler" status="Empty" ok={false}
              desc={queue > 0 ? `${queue} waiting — launch or cancel on demand.` : "Nothing queued — schedule from the campaign builder."}
              href="/channels/whatsapp/scheduler" Icon={CalendarClock} tone="sky" />
            <StatusCard eyebrow="Automation" title="Chatbot" status="Active" ok
              desc="Keyword triggers & branching journeys — reply 24/7." href="/channels/whatsapp/chatbot" Icon={Bot} tone="teal" />
            <StatusCard eyebrow="Account" title="Settings" status="Connected" ok
              desc={`${phone} · tier, quality, profile`} href="/channels/whatsapp/settings" Icon={SlidersHorizontal} tone="slate" />
          </div>
        </div>

        {/* help rail */}
        <div className="space-y-4">
          <Card className="p-5">
            <span className="grid size-10 place-items-center rounded-full bg-forest-950 text-lime">
              <Headphones className="size-5" />
            </span>
            <h3 className="mt-3 text-sm font-bold">Need setup help?</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
              We can help connect Facebook, WhatsApp, payment, and templates without your team handling Meta settings.
            </p>
            <button className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-forest-950 text-xs font-semibold text-white hover:opacity-90">
              <Headphones className="size-3.5" /> Contact support
            </button>
          </Card>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Quick links</p>
            <button className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left hover:bg-gray-50">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <MessageCircle className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">WhatsApp Manager</span>
                <span className="block text-xs text-gray-400">Manage number & settings</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-gray-300" />
            </button>
          </div>

          <div className="rounded-2xl bg-lime/20 p-5">
            <h3 className="text-sm font-bold">Want a walkthrough?</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600">Book a free onboarding call with our team.</p>
            <button className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-forest-950/20 bg-white text-xs font-semibold hover:bg-forest-950 hover:text-white">
              <CalendarClock className="size-3.5" /> Schedule a Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  rose: "bg-rose-50 text-rose-500",
  violet: "bg-violet-50 text-violet-500",
  sky: "bg-sky-50 text-sky-500",
  teal: "bg-teal-50 text-teal-500",
  slate: "bg-gray-100 text-gray-600",
};

function StatusCard({ eyebrow, title, status, ok, desc, href, Icon, tone }: {
  eyebrow: string; title: string; status: string; ok: boolean; desc: string; href: string;
  Icon: typeof FileText; tone: keyof typeof TONES;
}) {
  return (
    <Link href={href} className="block">
      <Card className="flex h-full flex-col justify-between p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{eyebrow}</p>
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${ok ? "text-emerald-600" : "text-amber-600"}`}>
            <span className={`size-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} /> {status}
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{desc}</p>
          </div>
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}>
            <Icon className="size-5" />
          </span>
        </div>
      </Card>
    </Link>
  );
}
