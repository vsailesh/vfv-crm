import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

type P = { params: Promise<{ code: string }> };

// GET /r/[code] — public short-link redirect with scan attribution.
// New vs existing visitor decided by a per-code cookie (1 year).
export async function GET(req: NextRequest, { params }: P) {
  const { code } = await params;
  const qr = db.prepare("SELECT * FROM qr_codes WHERE code = ?").get(code) as
    | { id: string; code: string; status: string; destinationUrl: string }
    | undefined;

  if (!qr) {
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><title>QR not found</title>
       <body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0c1f16;color:#fff">
       <div style="text-align:center"><h1>QR not found</h1><p style="opacity:.6">This code doesn't exist or was deleted.</p></div></body>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  if (qr.status !== "live") {
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><title>QR paused</title>
       <body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0c1f16;color:#fff">
       <div style="text-align:center"><h1>This QR code is paused</h1><p style="opacity:.6">Please contact the business directly.</p></div></body>`,
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const cookieName = `vfvqr_${qr.code}`;
  const returning = req.cookies.get(cookieName)?.value === "1";
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE qr_codes SET scans = scans + 1, newScans = newScans + ?, existingScans = existingScans + ?, lastScanAt = ? WHERE id = ?"
  ).run(returning ? 0 : 1, returning ? 1 : 0, now, qr.id);

  const res = NextResponse.redirect(qr.destinationUrl);
  if (!returning) res.cookies.set(cookieName, "1", { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/" });
  return res;
}
