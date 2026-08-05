import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  getReferenceItem,
  isReferenceConfigured,
} from "@/lib/notion-reference";
import { guardApiRequest, withAntiScrapeHeaders } from "@/lib/request-guard";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = await guardApiRequest(req, {
    scope: "reference:detail",
    limit: 40,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  if (!isReferenceConfigured()) {
    return withAntiScrapeHeaders(
      NextResponse.json({ error: "Reference DB is not configured" }, { status: 503 })
    );
  }

  const { id } = await params;
  const item = await getReferenceItem(id);

  if (!item) {
    return withAntiScrapeHeaders(
      NextResponse.json({ error: "Not found" }, { status: 404 })
    );
  }

  const admin = await isAdmin();
  if (!admin && item.isPublic === false) {
    return withAntiScrapeHeaders(
      NextResponse.json({ error: "Not found" }, { status: 404 })
    );
  }

  return withAntiScrapeHeaders(NextResponse.json(item));
}
