import { NextRequest, NextResponse } from "next/server";
import { deleteGeneration, deleteUpload, getGenerations, getUploads } from "@/lib/localDb";
import { removeMedia } from "@/lib/localMedia";

export async function GET(request: NextRequest) {
  const page = Math.max(0, Number(request.nextUrl.searchParams.get("page") || 0));
  const limit = 24;
  const generations = getGenerations().map((item) => ({
    id: item.id, url: item.image_url!, mediaType: "image" as const, source: "generation" as const,
    prompt: item.prompt, model: item.model, aspect_ratio: item.aspect_ratio, quality: item.quality,
    referenceImageUrls: item.reference_image_urls, created_at: item.created_at,
  }));
  const uploads = getUploads().filter((item) => item.mime_type.startsWith("image/")).map((item) => ({
    id: item.id, url: item.url, mediaType: "image" as const, source: "upload" as const, created_at: item.created_at,
  }));
  const all = [...generations, ...uploads].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const offset = page * limit;
  return NextResponse.json({ items: all.slice(offset, offset + limit), hasMore: all.length > offset + limit, total: all.length });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json() as { id?: string; source?: "generation" | "upload"; url?: string };
  if (!body.id || !body.source) return NextResponse.json({ error: "id and source are required" }, { status: 400 });
  if (body.source === "generation") deleteGeneration(body.id); else deleteUpload(body.id);
  if (body.url) await removeMedia(body.url);
  return NextResponse.json({ ok: true });
}
