"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, MoreHorizontal, MessageCircle } from "lucide-react";
import { Badge, Card, SecondaryButton, PrimaryButton } from "@/components/ui";

type Staff = {
  id: string; name: string; email: string; phone: string;
  role: string; department: string; availability: string;
  waCapacityUsed: number; status: string; lastActiveAt: string;
};

const TONE = ["bg-teal-100 text-teal-700", "bg-sky-100 text-sky-700", "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700", "bg-lime-100 text-lime-700"];

export default function StaffsPage() {
  const [rows, setRows] = useState<Staff[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "Sales Exec", department: "Sales" });
  const [role, setRole] = useState("All Roles");
  const [status, setStatus] = useState("All Status");

  const load = useCallback(async () => {
    const res = await fetch("/api/staff");
    const json = await res.json();
    setRows(json.data.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.name.trim() || !form.email.trim()) return;
    await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, password: "welcome123" }) });
    setForm({ name: "", email: "", phone: "", role: "Sales Exec", department: "Sales" });
    setShowAdd(false);
    load();
  }

  const filtered = rows.filter((r) => (role === "All Roles" || r.role === role) && (status === "All Status" || r.status === status));
  const roles = ["All Roles", ...new Set(rows.map((r) => r.role))];
  const active = rows.filter((r) => r.status === "active").length;
  const efficiency = rows.length ? Math.min(99, Math.round((active / rows.length) * 100)) : 0;

  const lastActive = (iso: string) => {
    if (!iso) return "Never";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Card className="flex flex-wrap items-start justify-between gap-6 p-7">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Team & Roles</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Who&apos;s on the floor, what they own, and how reachable they are.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SecondaryButton onClick={load}><RefreshCw className="size-4 text-gray-500" /> Recent</SecondaryButton>
          <PrimaryButton onClick={() => setShowAdd(true)}><Plus className="size-4" /> Add Staff Member</PrimaryButton>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([["Total Staff", rows.length], ["Active", active], ["Lead Conversion", "18.2%"], ["Efficiency", `${efficiency}%`]] as const).map(([label, v]) => (
          <Card key={label} className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="mt-1 text-3xl font-bold">{v}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-gray-100 px-6 py-4">
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium outline-none">
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium outline-none">
            {["All Status", "active", "invited", "inactive"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3">Staff Member</th>
                <th className="px-4 py-3">Role & Dept</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3">WA Capacity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50/60">
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-3">
                      <span className={`grid size-9 place-items-center rounded-full text-xs font-bold ${TONE[i % TONE.length]}`}>
                        {s.name.split(" ").map((w) => w[0]).join("")}
                      </span>
                      <span>
                        <span className="block font-semibold">{s.name}</span>
                        <span className="block text-xs text-gray-400">{s.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="block font-medium">{s.role}</span>
                    <span className="block text-xs text-gray-400">{s.department}</span>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{s.phone}</td>
                  <td className="px-4 py-4">
                    <Badge variant={s.availability === "available" ? "active" : "engaged"}>{s.availability}</Badge>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="size-3.5 text-emerald-500" />
                      {s.waCapacityUsed} active · Unlimited
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={s.status === "active" ? "active" : "contacted"}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-4 text-gray-500">{lastActive(s.lastActiveAt)}</td>
                  <td className="px-4 py-4">
                    <button className="grid size-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">Add Staff Member</h2>
            <div className="space-y-3">
              {(["name", "email", "phone"] as const).map((k) => (
                <input key={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  placeholder={k === "name" ? "Full name" : k === "email" ? "Email" : "+91 Phone"}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
              ))}
              <div className="grid grid-cols-2 gap-3">
                <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role"
                  className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none" />
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Department"
                  className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none" />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowAdd(false)} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={add} className="h-10 flex-1 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover">Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
