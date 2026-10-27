import type { ReactNode } from "react";

// Status badge variants captured from the reference app
const VARIANTS: Record<string, string> = {
  whatsapp: "bg-emerald-100 text-emerald-700",
  website: "bg-blue-100 text-blue-700",
  manual: "bg-gray-100 text-gray-600",
  qr: "bg-purple-100 text-purple-700",
  converted: "bg-lime-soft text-ink",
  new: "bg-gray-100 text-gray-600",
  contacted: "bg-indigo-100 text-indigo-600",
  engaged: "bg-amber-100 text-amber-700",
  qualified: "bg-cyan-100 text-cyan-700",
  negotiation: "bg-orange-100 text-orange-700",
  on_hold: "bg-slate-100 text-slate-600",
  unresponsive: "bg-rose-100 text-rose-700",
  lost: "bg-red-100 text-red-700",
  junk: "bg-slate-100 text-slate-500",
  active: "bg-emerald-100 text-emerald-700",
  prospect: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-gray-100 text-gray-600",
};

export function Badge({ variant, children }: { variant: string; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold uppercase tracking-wider ${VARIANTS[variant] ?? VARIANTS.info}`}>
      {children}
    </span>
  );
}

export function StatPill({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="flex h-10 items-center gap-2 rounded-full bg-gray-100 px-4 text-[11px] font-bold uppercase tracking-wide text-gray-500">
      {label}
      {value !== undefined && <span className="text-gray-900">{value}</span>}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-gray-100 bg-white shadow-card ${className}`}>{children}</section>
  );
}

export function PageHeader({
  title, subtitle, children,
}: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-wrap items-start justify-between gap-6 p-7">
      <div className="max-w-md">
        <h1 className="text-3xl font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-3 text-base leading-relaxed text-gray-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </Card>
  );
}

export function SecondaryButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 items-center gap-2 rounded-xl bg-lime px-5 text-sm font-semibold text-forest-950 hover:bg-lime-hover active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon && <div className="text-gray-300">{icon}</div>}
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
