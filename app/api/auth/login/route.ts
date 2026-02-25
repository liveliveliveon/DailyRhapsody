import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (body.password !== password) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const cookie = createSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
