import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getDiaries, saveDiaries, type Diary } from "@/lib/diaries-store";
import { allDiaries } from "@/app/diaries.data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const diaries = await getDiaries(allDiaries);
  const diary = diaries.find((d) => String(d.id) === id);
  if (!diary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(diary);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: { date?: string; title?: string; summary?: string; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const diaries = await getDiaries(allDiaries);
  const index = diaries.findIndex((d) => String(d.id) === id);
  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updated: Diary = {
    ...diaries[index],
    date: body.date ?? diaries[index].date,
    title: body.title ?? diaries[index].title,
    summary: body.summary ?? diaries[index].summary,
    tags: body.tags !== undefined ? body.tags : diaries[index].tags,
  };
  diaries[index] = updated;
  diaries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  await saveDiaries(diaries);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const diaries = await getDiaries(allDiaries);
  const index = diaries.findIndex((d) => String(d.id) === id);
  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  diaries.splice(index, 1);
  await saveDiaries(diaries);
  return NextResponse.json({ ok: true });
}
