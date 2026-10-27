"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Mail, Phone, Building2, MessageCircle, Zap, Users, Clock, Inbox as InboxIcon } from "lucide-react";
import { Card } from "@/components/ui";

type Member = {
  id: string; staffCode: string; name: string; email: string; phone: string;
  role: string; department: string | null; designation: string | null;
  isActive: number; isAvailable: number; currentActiveLeads: number; maxActiveLeads: number;
  createdAt: string; status: string; availability: string; permissions: string[];
};
type Stats = {
  customersOwned: number; leadsAssigned: number; leadsConverted: number;
  conversionPct: number; lastAssignedAt: string | null; pendingFollowUps: number;
};
type Activity = { id: string; customerId: string; kind: string; text: string; createdAt: string };

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ member: Member; stats: Stats; activity: Activity[] } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/staff/${id}`).then((r) => r.json()).then((j) => {
      if (j.data?.member) setData(j.data);
      else setNotFound(true);
    });
  }, [id]);

  if (notFound) return <div className="p-8 text-sm text-gray-500">Staff member not found.</div>;
  if (!data) return <div className="p-8 text-sm text-gray-500">Loading profile…</div>;

  const { member: m, stats: s } = data;
  const initials = m.name.split(" ").map((w) => w[0]).join("");

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/staffs")} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900">
          <ArrowLeft className="size-4" /> Back to team
        </button>
        <button onClick={() => router.push(`/staffs?edit=${id}`)} className="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold hover:bg-gray-50">
          <Pencil className="size-3.5" /> Edit profile
        </button>
      </div>

      {/* identity header */}
      <Card className="flex flex-wrap items-center justify-between gap-5 p-7">
        <div className="flex items-center gap-4">
          <span className="relative grid size-14 place-items-center rounded-full bg-lime text-lg font-bold text-forest-950">
            {initials}
            <span className={`absolute bottom-0 left-0 size-3.5 rounded-full border-2 border-white ${m.status === "active" ? "bg-emerald-500" : "bg-gray-300"}`} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{m.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${m.status === "active" ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"}`}>{m.status}</span>
              {m.isAvailable ? <span className="rounded-full border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold uppercase text-emerald-600">Routing on</span> : <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-bold uppercase text-gray-400">Routing off</span>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>👤 {m.role === "admin" ? "Administrator" : "Team member"}</span>
              {m.designation && <span>🏷 {m.designation}</span>}
              <span className="font-mono">{m.staffCode}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Member since</p>
          <p className="mt-1 text-sm font-semibold">
            {new Date(m.createdAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* left column */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold">Contact</h2>
            <ul className="space-y-3.5 text-sm">
              <li className="flex items-center gap-3"><Mail className="size-4 text-gray-400" /><span className="text-gray-700">{m.email ?? "—"}</span></li>
              <li className="flex items-center gap-3"><Phone className="size-4 text-gray-400" /><span className="text-gray-700">{m.phone ?? "—"}</span></li>
              <li className="flex items-center gap-3">
                <Building2 className="size-4 text-gray-400" />
                <span className="text-gray-700">{m.department ? <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" />{m.department}</span> : "—"}</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><MessageCircle className="size-4 text-emerald-500" /> WhatsApp Capacity</h2>
            <p className="text-3xl font-bold">{m.currentActiveLeads}<span className="text-base font-medium text-gray-400"> / {m.maxActiveLeads || "∞"}</span></p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-lime" style={{ width: m.maxActiveLeads ? `${Math.min(100, (m.currentActiveLeads / m.maxActiveLeads) * 100)}%` : "8%" }} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-gray-400">
              Live WhatsApp conversations counted toward auto-assignment only. 0 means unlimited.
            </p>
          </Card>
        </div>

        {/* right column */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Card className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Leads Converted</p>
              <p className="mt-1.5 flex items-baseline gap-1 text-2xl font-bold">
                {s.leadsConverted} <span className="text-sm font-medium text-gray-400">/ {s.leadsAssigned}</span>
              </p>
              <span className="mt-2 inline-block rounded-full bg-lime/25 px-2 py-0.5 text-[11px] font-bold text-forest-950">{s.conversionPct}%</span>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-lime" style={{ width: `${Math.min(100, s.conversionPct)}%` }} />
              </div>
            </Card>
            <Card className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pending Follow-ups</p>
              <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold">{s.pendingFollowUps}<Zap className="size-4 text-amber-500" /></p>
              <p className="mt-2 text-[11px] text-gray-400">On their customers</p>
            </Card>
            <Card className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Customers Owned</p>
              <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold">{s.customersOwned}<Users className="size-4 text-sky-500" /></p>
            </Card>
            <Card className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Last Assigned</p>
              <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold">
                <Clock className="size-4 text-gray-400" />
                {s.lastAssignedAt ? new Date(s.lastAssignedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}
              </p>
              <p className="mt-2 text-[11px] text-gray-400">{s.lastAssignedAt ? new Date(s.lastAssignedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "Never"}</p>
            </Card>
          </div>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Zap className="size-4 text-amber-500" /> Activity Log</h2>
              <span className="text-xs text-gray-400">{data.activity.length} events</span>
            </div>
            {data.activity.length === 0 ? (
              <div className="grid place-items-center gap-2 py-10 text-center">
                <InboxIcon className="size-8 text-gray-200" />
                <p className="text-sm font-semibold text-gray-500">No activity yet</p>
                <p className="max-w-sm text-xs text-gray-400">Notes, tags, pipeline changes, assignments, and follow-ups for customers will appear here when this member performs them.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {data.activity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{a.text}</span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(a.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
