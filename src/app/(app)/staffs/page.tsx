"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Search, MessageCircle } from "lucide-react";
import { Card, SecondaryButton, PrimaryButton } from "@/components/ui";

type Staff = {
  id: string; staffCode: string; name: string; email: string; phone: string;
  role: string; department: string | null; designation: string | null;
  availability: string; isAvailable: number; isActive: number;
  waCapacityUsed: number; maxActiveLeads: number; status: string; lastActiveAt: string;
  permissions: string[];
};

const PERMISSIONS = [
  ["inbox", "Unified Inbox"],
  ["crm:customers", "CRM - Customers"],
  ["crm:pipeline", "CRM - Lead Pipeline"],
  ["crm:followups", "CRM - Follow-ups"],
  ["crm:segments", "CRM - Segments"],
  ["crm:analytics", "CRM - Analytics"],
  ["wa:templates", "WhatsApp - Templates"],
  ["wa:campaigns", "WhatsApp - Campaigns"],
  ["wa:chatbot", "WhatsApp - Chatbot"],
  ["gmb", "Google My Business"],
  ["qr", "QR Studio"],
] as const;

type FormState = {
  name: string; email: string; phone: string; password: string; role: string;
  department: string; designation: string; maxActiveLeads: number;
  permissions: string[]; isAvailable: boolean; isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "", email: "", phone: "", password: "", role: "staff",
  department: "", designation: "", maxActiveLeads: 0,
  permissions: ["inbox", "crm:customers", "crm:pipeline"], isAvailable: true, isActive: true,
};

const TONE = ["bg-teal-100 text-teal-700", "bg-sky-100 text-sky-700", "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700", "bg-lime-100 text-lime-700"];

export default function StaffsPage() {
  return (
    <Suspense>
      <StaffsInner />
    </Suspense>
  );
}

function StaffsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Staff[]>([]);
  const [metrics, setMetrics] = useState<{ totalStaff: number; activeStaff: number; conversionRate: number } | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All Roles");
  const [status, setStatus] = useState("All Status");
  const [editor, setEditor] = useState<{ mode: "add" } | { mode: "edit"; staff: Staff } | null>(null);

  const load = useCallback(async () => {
    const json = await fetch("/api/staff").then((r) => r.json());
    setRows(json.data.data);
    setMetrics(json.data.metrics);
    return json.data.data as Staff[];
  }, []);

  useEffect(() => { load(); }, [load]);

  // Deep link from a profile page: /staffs?edit=<id> opens the editor on that member.
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    fetch("/api/staff").then((r) => r.json()).then((j) => {
      const staff = (j.data.data as Staff[]).find((s) => s.id === editId);
      if (staff) setEditor({ mode: "edit", staff });
    });
  }, [searchParams]);

  async function flipAvailability(s: Staff) {
    await fetch("/api/staff", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, isAvailable: s.isAvailable ? 0 : 1 }),
    });
    load();
  }

  const filtered = rows.filter((r) => {
    const hay = `${r.name} ${r.email} ${r.department ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase()) && (role === "All Roles" || r.role === role) && (status === "All Status" || r.status === status);
  });
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
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Manage your team, roles, performance, and permissions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SecondaryButton onClick={load}><RefreshCw className="size-4 text-gray-500" /> Recent</SecondaryButton>
          <PrimaryButton onClick={() => setEditor({ mode: "add" })}><Plus className="size-4" /> Add Staff Member</PrimaryButton>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([["Total Staff", rows.length], ["Active", active], ["Lead Conversion", `${metrics?.conversionRate ?? 0}%`], ["Efficiency", `${efficiency}%`]] as const).map(([label, v]) => (
          <Card key={label} className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="mt-1 text-3xl font-bold">{v}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-gray-100 px-6 py-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, department..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium outline-none">
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium outline-none">
            {["All Status", "active", "inactive"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3">Staff Member</th>
                <th className="px-4 py-3">Role & Dept</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3">WA Capacity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3">Actions</th>
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
                    <span className="block font-semibold uppercase">{s.role === "admin" ? "Administrator" : "Staff"}</span>
                    <span className="block text-xs text-gray-400">{s.department ?? "—"}</span>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{s.phone ?? "—"}</td>
                  <td className="px-4 py-4">
                    <button onClick={() => flipAvailability(s)} role="switch" aria-checked={!!s.isAvailable} aria-label={`Toggle availability for ${s.name}`}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                        s.isAvailable ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}>
                      {s.isAvailable ? "Available" : "Busy"}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="size-3.5 text-emerald-500" />
                      {s.waCapacityUsed} active · {s.maxActiveLeads ? `${s.maxActiveLeads} max` : "Unlimited"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${s.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-500">{lastActive(s.lastActiveAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => router.push(`/staffs/${s.id}`)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">View Details</button>
                      <button onClick={() => setEditor({ mode: "edit", staff: s })}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">Edit Staff</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editor && (
        <StaffEditor
          mode={editor}
          onClose={() => setEditor(null)}
          onSaved={() => { setEditor(null); load(); }}
        />
      )}
    </div>
  );
}

// Add / Edit modal — one form component, both modes (buzbiz parity).
function StaffEditor({ mode, onClose, onSaved }: { mode: { mode: "add" } | { mode: "edit"; staff: Staff }; onClose: () => void; onSaved: () => void }) {
  const editing = mode.mode === "edit" ? mode.staff : null;
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          name: editing.name, email: editing.email ?? "", phone: editing.phone ?? "", password: "",
          role: editing.role, department: editing.department ?? "", designation: editing.designation ?? "",
          maxActiveLeads: editing.maxActiveLeads ?? 0, permissions: editing.permissions ?? [],
          isAvailable: !!editing.isAvailable, isActive: !!editing.isActive,
        }
      : EMPTY_FORM,
  );
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function flipPerm(key: string) {
    set("permissions", form.permissions.includes(key) ? form.permissions.filter((p) => p !== key) : [...form.permissions, key]);
  }

  async function save() {
    if (!form.name.trim() || !form.phone.trim() || !form.permissions.length) return;
    setBusy(true);
    const payload = {
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), role: form.role,
      department: form.department.trim() || null, designation: form.designation.trim() || null,
      maxActiveLeads: Number(form.maxActiveLeads) || 0, permissions: form.permissions,
      isAvailable: form.isAvailable ? 1 : 0, isActive: form.isActive ? 1 : 0,
      ...(form.password ? { password: form.password } : {}),
    };
    await fetch("/api/staff", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{editing ? "Edit Staff Member" : "Add Staff Member"}</h2>
        <div className="space-y-3">
          <Field label="Name *">
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="John Doe"
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com"
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
          </Field>
          <Field label="Phone *">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210"
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
          </Field>
          {editing && (
            <Field label="Change Password (optional)">
              <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••"
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role *">
              <select value={form.role} onChange={(e) => set("role", e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white">
                <option value="staff">staff</option>
                <option value="admin">administrator</option>
              </select>
            </Field>
            <Field label="Max Active Conversations">
              <input type="number" min={0} value={form.maxActiveLeads} onChange={(e) => set("maxActiveLeads", Number(e.target.value) || 0)} placeholder="0 = unlimited"
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department">
              <input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Sales, Support, etc."
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            </Field>
            <Field label="Designation">
              <input value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="Senior Associate"
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
            </Field>
          </div>
          <p className="pt-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Access Permissions * (select at least one)</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-gray-100 p-3">
            {PERMISSIONS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <input type="checkbox" checked={form.permissions.includes(key)} onChange={() => flipPerm(key)} className="size-4 accent-lime" />
                {label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <input type="checkbox" checked={form.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)} className="size-4 accent-lime" />
              Available for Assignments
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="size-4 accent-lime" />
              Active Member
            </label>
          </div>
          <p className="text-[11px] text-gray-400">Max conversations controls WhatsApp auto-assignment load only.</p>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button onClick={onClose} className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={busy || !form.name.trim() || !form.phone.trim() || !form.permissions.length}
            className="h-10 flex-1 rounded-xl bg-lime text-sm font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">
            {busy ? "Saving…" : editing ? "Update Staff Member" : "Send Invite"}
          </button>
        </div>
        {editing && <p className="mt-3 text-center text-[11px] text-gray-400">ID: {editing.staffCode}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      {children}
    </div>
  );
}
