import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveDiaries } from "@/lib/diaries-store";
import { allDiaries } from "@/app/diaries.data";

/** One-time: copy static allDiaries into data/diaries.json so admin edits persist. */
export async function POST() {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await saveDiaries([...allDiaries]);
  return NextResponse.json({ ok: true, count: allDiaries.length });
}
