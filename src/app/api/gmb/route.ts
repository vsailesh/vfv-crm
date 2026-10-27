import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

// GET /api/gmb — listing summary + reviews + questions
export async function GET() {
  const reviews = db.prepare("SELECT * FROM gmb_reviews ORDER BY reviewedAt DESC").all() as Array<{
    id: string; authorName: string; rating: number; body: string | null;
    replied: number; reply: string | null; reviewedAt: string;
  }>;
  const questions = db.prepare("SELECT * FROM gmb_questions ORDER BY askedAt DESC").all() as Array<{
    id: string; authorName: string; question: string; answer: string | null; answeredBy: string | null; askedAt: string;
  }>;

  const n = reviews.length;
  const avg = n ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / n) * 10) / 10 : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const unanswered = reviews.filter((r) => !r.replied).length;
  const openQuestions = questions.filter((q) => !q.answer).length;

  return ok({
    listing: { connected: true, name: "Veda For Vaidyas", avgRating: avg, totalReviews: n, unanswered, openQuestions },
    distribution: dist,
    reviews,
    questions,
  });
}

// PATCH /api/gmb — reply to a review or answer a question
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (b?.reviewId && typeof b.reply === "string" && b.reply.trim()) {
    db.prepare("UPDATE gmb_reviews SET replied = 1, reply = ? WHERE id = ?").run(b.reply.trim(), b.reviewId);
    return ok({ id: b.reviewId });
  }
  if (b?.questionId && typeof b.answer === "string" && b.answer.trim()) {
    db.prepare("UPDATE gmb_questions SET answer = ?, answeredBy = 'Veda For Vaidyas' WHERE id = ?").run(b.answer.trim(), b.questionId);
    return ok({ id: b.questionId });
  }
  return bad("reviewId/questionId with reply/answer text required");
}
