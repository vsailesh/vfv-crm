"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Inbox, Users,
  UserRound, MessageCircle, MapPin, QrCode, ChevronDown, Coins, Bell, RefreshCw, PanelLeft,
  type LucideIcon,
} from "lucide-react";

type NavLink = { href: string; label: string; icon: LucideIcon };
type NavPlain = { label: string; icon: LucideIcon };
type NavExpand = { label: string; icon: LucideIcon; children: Array<{ href: string; label: string }> };
type NavItem = NavLink | NavPlain | NavExpand;
const NAV: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Dashboard",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inbox", label: "Unified Inbox", icon: Inbox },
      {
        label: "CRM", icon: Users, children: [
          { href: "/crm/customers", label: "Customers" },
          { href: "/crm/pipeline", label: "Pipeline" },
          { href: "/crm/follow-ups", label: "Follow-ups" },
          { href: "/crm/segments", label: "Segments" },
          { href: "/crm/analytics", label: "Analytics" },
        ],
      },
      { href: "/staffs", label: "Staff", icon: UserRound },
    ],
  },
  {
    label: "Channels",
    items: [
      { href: "/channels/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { href: "/channels/google-my-business", label: "Google My Business", icon: MapPin },
    ],
  },
  {
    label: "Tools",
    items: [{ href: "/tools/qr-studio", label: "QR Studio", icon: QrCode }],
  },
];

export function Sidebar() {
  const path = usePathname();
  const crmOpen = path?.startsWith("/crm");
  const [open, setOpen] = useState(crmOpen ?? true);
  const [collapsed, setCollapsed] = useState(false);

  const itemCls = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors ${
      active ? "bg-lime font-semibold text-forest-950" : "text-white/75 hover:bg-white/5 hover:text-white"
    } ${collapsed ? "justify-center px-2" : ""}`;

  return (
    <aside className={`sticky top-0 flex h-screen shrink-0 flex-col bg-forest-950 text-white transition-[width] ${collapsed ? "w-[76px]" : "w-72"}`}>
      <div className={`flex items-center py-5 ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-lime text-sm font-black text-forest-950">B</span>
          {!collapsed && <span className="text-lg font-bold tracking-tight">VFV CRM</span>}
        </Link>
        {!collapsed && (
          <button aria-label="Collapse sidebar" onClick={() => setCollapsed(true)}
            className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white">
            <PanelLeft className="size-4" />
          </button>
        )}
      </div>
      {collapsed && (
        <button aria-label="Expand sidebar" onClick={() => setCollapsed(false)}
          className="mx-auto mb-2 grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white">
          <PanelLeft className="size-4 rotate-180" />
        </button>
      )}

      <nav className="scroll-thin flex-1 overflow-y-auto px-4">
        {NAV.map((section) => (
          <div key={section.label} className="mt-6 first:mt-1">
            <p className={`mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 ${collapsed ? "hidden" : ""}`}>{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) =>
                "children" in item && item.children ? (
                  <div key={item.label}>
                    <button
                      onClick={() => setOpen(!open)}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white/75 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <item.icon className="size-[18px]" />
                      <span className={`flex-1 text-left ${collapsed ? "hidden" : ""}`}>{item.label}</span>
                      <ChevronDown className={`size-4 transition-transform ${collapsed ? "hidden" : open ? "rotate-0" : "-rotate-90"}`} />
                    </button>
                    {open && !collapsed && (
                      <div className="mt-1 space-y-1 pl-6">
                        {item.children.map((c) => {
                          const active = path === c.href;
                          return (
                            <Link
                              key={c.href}
                              href={c.href}
                              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                                active
                                  ? "border-l-2 border-lime font-medium text-lime"
                                  : "border-l-2 border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              {c.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : "href" in item ? (
                  <Link key={item.href} href={item.href} title={item.label} className={itemCls(path === item.href)}>
                    <item.icon className="size-[18px] shrink-0" />
                    {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
                  </Link>
                ) : (
                  <span key={item.label} className={`flex cursor-default items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white/45 ${collapsed ? "justify-center px-2" : ""}`}>
                    <item.icon className="size-[18px] shrink-0" />
                    {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
                  </span>
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className={`mt-auto flex items-center gap-3 border-t border-white/10 p-4 ${collapsed ? "justify-center" : ""}`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime/20 text-sm font-bold text-lime">H</span>
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold">Account</p>
            <p className="text-xs text-white/50">Free Plan</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export function TopBar({ tokens }: { tokens?: string }) {
  const [balance, setBalance] = useState(tokens ?? "—");
  const [spinning, setSpinning] = useState(false);

  async function refresh() {
    setSpinning(true);
    try {
      const json = await fetch("/api/settings").then((r) => r.json());
      const n: number = json?.data?.aiTokens ?? 0;
      setBalance(n.toLocaleString("en-IN"));
    } finally {
      setTimeout(() => setSpinning(false), 600);
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-page px-6">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-forest-950 text-sm font-bold text-lime">V</span>
        <span className="text-base font-semibold">Veda For Vaidyas</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-[13px]">
          <Coins className="size-4 text-gray-400" />
          <span className="font-semibold uppercase tracking-wide text-gray-500">AI Tokens:</span>
          <span className="font-bold">{balance}</span>
        </span>
        <button aria-label="Refresh token balance" onClick={refresh}
          className="grid size-10 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800">
          <RefreshCw className={`size-4 ${spinning ? "animate-spin" : ""}`} />
        </button>
        <button aria-label="Notifications" className="grid size-10 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
          <Bell className="size-[18px]" />
        </button>
      </div>
    </header>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
