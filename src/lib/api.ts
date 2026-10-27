import { NextResponse } from "next/server";

// Buzbiz-style envelope: {statusCode, data, message}
export function ok(data: unknown, message = "OK") {
  return NextResponse.json({ statusCode: 200, data, message });
}
export function bad(message: string, statusCode = 400) {
  return NextResponse.json({ statusCode, data: {}, message }, { status: statusCode });
}
