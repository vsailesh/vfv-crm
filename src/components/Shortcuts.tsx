"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Keyboard, X } from "lucide-react";

// Global keyboard shortcuts. Mounted once from the app layout.
//   ?        toggle this help overlay
//   /        focus the page's search box
//   g + key  go to a page (g d dashboard, g p pipeline, ...)
//   n        trigger the page's "New ..." primary button
//   Esc      close the topmost modal (clicks its backdrop)
const GO: Record<string, string> = {
  d: "/dashboard",
  i: "/inbox",
  c: "/crm/customers",
  p: "/crm/pipeline",
  f: "/crm/follow-ups",
  s: "/crm/segments",
  a: "/crm/analytics",
  w: "/channels/whatsapp",
  g: "/channels/google-my-business",
};

const GROUPS: Array<{ title: string; keys: Array<[string, string]> }> = [
  {
    title: "Navigation",
    keys: [
      ["g d", "Dashboard"],
      ["g i", "Unified Inbox"],
      ["g c", "Customers"],
      ["g p", "Pipeline"],
      ["g f", "Follow-ups"],
      ["g s", "Segments"],
      ["g a", "Analytics"],
      ["g w", "WhatsApp"],
      ["g g", "Google My Business"],
    ],
  },
  {
    title: "Actions",
    keys: [
      ["/", "Focus search"],
      ["n", "New lead / segment / customer"],
      ["Esc", "Close dialog"],
      ["?", "This overlay"],
    ],
  },
];

export default function Shortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [help, setHelp] = useState(false);
  const chord = useRef(false); // true between pressing g and the next key
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function typing(t: EventTarget | null): boolean {
      const el = t as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable
      );
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Esc — help first, then blur focused input, then dismiss topmost modal via its backdrop
      if (e.key === "Escape") {
        if (help) { setHelp(false); return; }
        if (typing(e.target)) { (e.target as HTMLElement).blur(); return; }
        const backdrops = Array.from(document.querySelectorAll<HTMLElement>(".fixed.inset-0"));
        const top = backdrops[backdrops.length - 1];
        if (top) { top.click(); e.preventDefault(); }
        return;
      }
      if (typing(e.target)) return;

      if (e.key === "?") { setHelp((v) => !v); e.preventDefault(); return; }

      // g-chord navigation
      if (chord.current) {
        chord.current = false;
        if (chordTimer.current) clearTimeout(chordTimer.current);
        const dest = GO[e.key.toLowerCase()];
        if (dest) { router.push(dest); e.preventDefault(); }
        return;
      }
      if (e.key.toLowerCase() === "g" && !help) {
        chord.current = true;
        chordTimer.current = setTimeout(() => (chord.current = false), 1200);
        e.preventDefault();
        return;
      }

      if (e.key === "/") {
        const box = document.querySelector<HTMLInputElement>('input[placeholder*="Search" i]');
        if (box) { box.focus(); box.select(); e.preventDefault(); }
        return;
      }

      if (e.key.toLowerCase() === "n" && !help) {
        const btn = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
          (b) => b.offsetParent !== null && /^New /.test(b.textContent?.trim() ?? "")
        );
        if (btn) { btn.click(); e.preventDefault(); }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (chordTimer.current) clearTimeout(chordTimer.current);
    };
  }, [router, pathname, help]);

  if (!help) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" onClick={() => setHelp(false)}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Keyboard className="size-5 text-forest-900" /> Keyboard Shortcuts
          </h2>
          <button onClick={() => setHelp(false)} className="text-gray-400 hover:text-gray-700"><X className="size-5" /></button>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">{g.title}</p>
              <ul className="space-y-2.5">
                {g.keys.map(([k, label]) => (
                  <li key={k} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-600">{label}</span>
                    <kbd className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs font-semibold text-gray-700">{k}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">Press ? or Esc to close</p>
      </div>
    </div>
  );
}
