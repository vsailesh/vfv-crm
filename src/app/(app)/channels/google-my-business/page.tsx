"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Star, MessageSquareReply, HelpCircle, Clock, RefreshCw } from "lucide-react";
import { Card, SecondaryButton } from "@/components/ui";

type Review = {
  id: string; authorName: string; rating: number; body: string | null;
  replied: number; reply: string | null; reviewedAt: string;
};
type Question = {
  id: string; authorName: string; question: string; answer: string | null; answeredBy: string | null; askedAt: string;
};
type GmbData = {
  listing: { connected: boolean; name: string; avgRating: number; totalReviews: number; unanswered: number; openQuestions: number };
  distribution: Array<{ star: number; count: number }>;
  reviews: Review[];
  questions: Question[];
};

const HOURS: Array<[string, string]> = [
  ["Monday – Friday", "9:00 am – 7:00 pm"],
  ["Saturday", "9:00 am – 5:00 pm"],
  ["Sunday", "Closed"],
];

export default function GmbPage() {
  const [data, setData] = useState<GmbData | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [ansFor, setAnsFor] = useState<string | null>(null);
  const [ansText, setAnsText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const json = await fetch("/api/gmb").then((r) => r.json());
    setData(json.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sendReply() {
    if (!replyFor || !replyText.trim()) return;
    setBusy(true);
    await fetch("/api/gmb", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: replyFor, reply: replyText }),
    });
    setBusy(false);
    setReplyFor(null);
    setReplyText("");
    load();
  }

  async function sendAnswer() {
    if (!ansFor || !ansText.trim()) return;
    setBusy(true);
    await fetch("/api/gmb", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: ansFor, answer: ansText }),
    });
    setBusy(false);
    setAnsFor(null);
    setAnsText("");
    load();
  }

  if (!data) return <div className="p-8 text-sm text-gray-500">Syncing your Google listing…</div>;

  const maxDist = Math.max(1, ...data.distribution.map((d) => d.count));
  const when = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* header */}
      <Card className="flex flex-wrap items-start justify-between gap-6 p-7">
        <div className="flex max-w-lg items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-forest-950 text-lime">
            <MapPin className="size-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Google My Business</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              {data.listing.name} · reviews, Q&A and business hours synced from your listing.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Listing connected
            </p>
          </div>
        </div>
        <SecondaryButton onClick={load}><RefreshCw className="size-4 text-gray-500" /> Sync now</SecondaryButton>
      </Card>

      {/* rating summary */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center justify-center p-7">
          <p className="text-6xl font-bold">{data.listing.avgRating}</p>
          <div className="mt-2 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`size-5 ${s <= Math.round(data.listing.avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">{data.listing.totalReviews} reviews on Google</p>
          {data.listing.unanswered > 0 && (
            <p className="mt-3 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">
              {data.listing.unanswered} awaiting your reply
            </p>
          )}
        </Card>

        <Card className="p-7">
          <h2 className="mb-5 text-lg font-bold">Rating breakdown</h2>
          <ul className="space-y-3">
            {data.distribution.map((d) => (
              <li key={d.star} className="flex items-center gap-3">
                <span className="flex w-10 items-center gap-1 text-sm font-semibold text-gray-600">
                  {d.star} <Star className="size-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${(d.count / maxDist) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-sm font-bold">{d.count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Reply rate</p>
              <p className="mt-1 text-2xl font-bold">
                {data.listing.totalReviews ? Math.round(((data.listing.totalReviews - data.listing.unanswered) / data.listing.totalReviews) * 100) : 0}%
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Open questions</p>
              <p className="mt-1 text-2xl font-bold">{data.listing.openQuestions}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* reviews + right rail */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Star className="size-5 text-amber-400" /> Recent reviews
          </h2>
          <ul className="divide-y divide-gray-50">
            {data.reviews.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.authorName}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                      {when(r.reviewedAt)} ·
                      <span className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`size-3 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                        ))}
                      </span>
                    </p>
                  </div>
                  {!r.replied && replyFor !== r.id && (
                    <button onClick={() => { setReplyFor(r.id); setReplyText(""); }}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold hover:bg-gray-50">
                      <MessageSquareReply className="size-3.5" /> Reply
                    </button>
                  )}
                </div>
                {r.body && <p className="mt-2 text-sm leading-relaxed text-gray-600">{r.body}</p>}
                {r.replied && r.reply && (
                  <div className="mt-3 rounded-xl bg-lime/10 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-forest-800">Your reply</p>
                    <p className="mt-1 text-sm text-gray-700">{r.reply}</p>
                  </div>
                )}
                {replyFor === r.id && (
                  <div className="mt-3 space-y-2">
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Thank them, address the issue, invite them back…"
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-lime" />
                    <div className="flex gap-2">
                      <button onClick={() => setReplyFor(null)}
                        className="h-9 rounded-xl border border-gray-200 px-4 text-xs font-semibold hover:bg-gray-50">Cancel</button>
                      <button onClick={sendReply} disabled={busy || !replyText.trim()}
                        className="h-9 rounded-xl bg-lime px-4 text-xs font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">
                        {busy ? "Posting…" : "Post reply"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <HelpCircle className="size-5 text-sky-500" /> Questions & answers
            </h2>
            <ul className="space-y-4">
              {data.questions.map((q) => (
                <li key={q.id} className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold leading-relaxed">{q.question}</p>
                  <p className="mt-1 text-xs text-gray-400">{q.authorName} · {when(q.askedAt)}</p>
                  {q.answer ? (
                    <div className="mt-2 rounded-lg bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{q.answeredBy}</p>
                      <p className="mt-1 text-sm text-gray-700">{q.answer}</p>
                    </div>
                  ) : ansFor === q.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea value={ansText} onChange={(e) => setAnsText(e.target.value)}
                        placeholder="Answer publicly on your listing…" rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-lime" />
                      <div className="flex gap-2">
                        <button onClick={() => setAnsFor(null)}
                          className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold hover:bg-gray-50">Cancel</button>
                        <button onClick={sendAnswer} disabled={busy || !ansText.trim()}
                          className="h-8 rounded-lg bg-lime px-3 text-xs font-semibold text-forest-950 hover:bg-lime-hover disabled:opacity-50">
                          {busy ? "Posting…" : "Post answer"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAnsFor(q.id); setAnsText(""); }}
                      className="mt-2 flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold hover:bg-gray-50">
                      <MessageSquareReply className="size-3.5" /> Answer
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Clock className="size-5 text-gray-400" /> Business hours
            </h2>
            <ul className="space-y-2.5 text-sm">
              {HOURS.map(([d, h]) => (
                <li key={d} className="flex items-center justify-between">
                  <span className="text-gray-600">{d}</span>
                  <span className={h === "Closed" ? "font-semibold text-red-500" : "font-semibold"}>{h}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-400">Edit hours directly in your Google Business Profile — they sync here.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
