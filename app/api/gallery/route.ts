import { NextRequest, NextResponse } from "next/server";
import { deleteGeneration, deleteUpload, getGenerationById, getGenerations, getUploadById, getUploads } from "@/lib/localDb";
import { removeMedia } from "@/lib/localMedia";
import { canAccessOwnedRecord } from "@/lib/galleryAccess";
import { getNetBirdIdentity, hasNetBirdIdentity } from "@/lib/netbird";

export async function GET(request: NextRequest) {
  const identity = getNetBirdIdentity(request.headers);
  if (!hasNetBirdIdentity(identity)) return NextResponse.json({ error: "NetBird identity is required" }, { status: 403 });
  const page = Math.max(0, Number(request.nextUrl.searchParams.get("page") || 0));
  const source = request.nextUrl.searchParams.get("source");
  const limit = 24;
  const generations = source === "uploaded" ? [] : getGenerations().filter((item) => canAccessOwnedRecord(item, identity)).map((item) => ({
    id: item.id, url: item.image_url!, mediaType: "image" as const, source: "generation" as const,
    prompt: item.prompt, model: item.model, aspect_ratio: item.aspect_ratio, quality: item.quality,
    referenceImageUrls: item.reference_image_urls, owner: identity.isImageGenAdmin ? item.owner : undefined, created_at: item.created_at,
  }));
  const uploads = source === "generated" ? [] : getUploads().filter((item) => item.mime_type.startsWith("image/") && canAccessOwnedRecord(item, identity)).map((item) => ({
    id: item.id, url: item.url, mediaType: "image" as const, source: "upload" as const, created_at: item.created_at,
    owner: identity.isImageGenAdmin ? item.owner : undefined,
  }));
  const all = [...generations, ...uploads].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const offset = page * limit;
  return NextResponse.json({ items: all.slice(offset, offset + limit), hasMore: all.length > offset + limit, total: all.length, isAdmin: identity.isImageGenAdmin });
}

export async function DELETE(request: NextRequest) {
  const identity = getNetBirdIdentity(request.headers);
  if (!hasNetBirdIdentity(identity)) return NextResponse.json({ error: "NetBird identity is required" }, { status: 403 });
  const body = await request.json() as { id?: string; source?: "generation" | "upload"; url?: string };
  if (!body.id || !body.source) return NextResponse.json({ error: "id and source are required" }, { status: 400 });
  const record = body.source === "generation" ? getGenerationById(body.id) : getUploadById(body.id);
  if (!record) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  if (!canAccessOwnedRecord(record, identity)) return NextResponse.json({ error: "You do not have access to this image" }, { status: 403 });
  if (body.source === "generation") deleteGeneration(body.id); else deleteUpload(body.id);
  if (body.url) await removeMedia(body.url);
  return NextResponse.json({ ok: true });
}
