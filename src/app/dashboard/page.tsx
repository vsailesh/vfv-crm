"use client";

import Link from "next/link";
import { MessageCircle, MapPin, QrCode, Inbox, Users, CreditCard, Sparkles } from "lucide-react";

const CARDS = [
  {
    eyebrow: "WhatsApp Business", title: "Reach customers in seconds.",
    desc: "WhatsApp API is live & humming.", status: "Connected", ok: true,
    icon: MessageCircle, tile: "bg-emerald-100 text-emerald-600", href: "/inbox",
  },
  {
    eyebrow: "Google My Business", title: "Win more 5-star reviews.",
    desc: "Connect to start managing reviews.", status: "Disconnected", ok: false,
    icon: MapPin, tile: "bg-gray-100 text-gray-600", href: "/dashboard",
  },
  {
    eyebrow: "QR Studio", title: "Scan once, connect forever.",
    desc: "Bridge the offline-to-online gap instantly.", status: "Active", ok: true,
    icon: QrCode, tile: "bg-indigo-100 text-indigo-600", href: "/dashboard",
  },
  {
    eyebrow: "Unified Inbox", title: "No message left behind.",
    desc: "WhatsApp, IG & more — one inbox.", status: "Active", ok: true,
    icon: Inbox, tile: "bg-orange-100 text-orange-600", href: "/inbox",
  },
  {
    eyebrow: "Team & Roles", title: "Build the dream team.",
    desc: "Invite, assign, and watch them fly.", status: "Active", ok: true,
    icon: Users, tile: "bg-orange-100 text-orange-600", href: "/staffs",
  },
  {
    eyebrow: "Plan & Billing", title: "Full power, no limits.",
    desc: "Free Plan · upgrade anytime.", status: "Active", ok: true,
    icon: CreditCard, tile: "bg-emerald-100 text-emerald-800", href: "/dashboard",
  },
];

export default function DashboardPage() {
  return (
    <div className="px-6 py-10 lg:px-12 xl:px-20">
      <div className="pb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Why you&apos;ll love VFV CRM.</h1>
        <p className="mt-3 text-base text-gray-500">Click any card to see details.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <FeatureCard {...CARDS[0]} />
        <FeatureCard {...CARDS[1]} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[2fr_1fr]">
        <article className="relative flex flex-col overflow-hidden rounded-[20px] bg-gradient-to-br from-forest-900 to-forest-950 p-8 text-white">
          <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-lime/20 blur-3xl" />
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lime/90">AI Co-pilot</p>
            <span className="rounded-full border border-lime/40 bg-lime/10 px-3 py-1 text-xs font-semibold text-lime">Coming Soon</span>
          </div>
          <h2 className="mt-4 max-w-[16ch] text-4xl font-semibold leading-[1.15] tracking-tight">BizBee knows your business inside out.</h2>
          <div className="mt-auto flex items-end justify-between gap-4 pt-8">
            <p className="max-w-[280px] text-[15px] leading-relaxed text-white/70">
              Health checks, setup steps &amp; smart actions.
            </p>
            <span className="flex items-center gap-2 rounded-full bg-forest-800 px-6 py-3 text-sm font-medium text-lime/90">
              <Sparkles className="size-4" /> Coming Soon
            </span>
          </div>
        </article>
        <FeatureCard {...CARDS[2]} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {CARDS.slice(3).map((c) => <FeatureCard key={c.eyebrow} {...c} />)}
      </div>
    </div>
  );
}

function FeatureCard(c: (typeof CARDS)[number] & { icon: any; tile: string; href: string }) {
  return (
    <Link href={c.href}
      className="flex flex-col rounded-[20px] border border-gray-200/70 bg-white p-7 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{c.eyebrow}</p>
        <span className={`flex items-center gap-1.5 text-[13px] font-medium ${c.ok ? "text-emerald-600" : "text-red-500"}`}>
          <span className={`size-2 rounded-full ${c.ok ? "bg-emerald-500" : "bg-red-500"}`} />
          {c.status}
        </span>
      </div>
      <h3 className="mt-4 max-w-[14ch] text-[28px] font-semibold leading-[1.15] tracking-tight">{c.title}</h3>
      <div className="mt-auto flex items-end justify-between gap-4 pt-8">
        <p className="max-w-[260px] text-[15px] leading-relaxed text-gray-500">{c.desc}</p>
        <span className={`grid size-16 shrink-0 place-items-center rounded-2xl ${c.tile}`}>
          <c.icon className="size-7" />
        </span>
      </div>
    </Link>
  );
}
