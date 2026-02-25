import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getDiaries, saveDiaries, nextId, type Diary } from "@/lib/diaries-store";
import { allDiaries } from "@/app/diaries.data";

export async function GET() {
  const diaries = await getDiaries(allDiaries);
  return NextResponse.json(diaries);
}

export async function POST(req: Request) {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { date?: string; title?: string; summary?: string; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const diaries = await getDiaries(allDiaries);
  const id = nextId(diaries);
  const newDiary: Diary = {
    id,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    title: body.title ?? "",
    summary: body.summary ?? "",
    tags: Array.isArray(body.tags) ? body.tags : [],
  };
  diaries.unshift(newDiary);
  diaries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  await saveDiaries(diaries);
  return NextResponse.json(newDiary);
}
