import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { mediaPath, type MediaFolder } from "@/lib/localMedia";
import { getGenerationByImageUrl, getUploadByUrl } from "@/lib/localDb";
import { canAccessOwnedRecord } from "@/lib/galleryAccess";
import { getNetBirdIdentity, hasNetBirdIdentity } from "@/lib/netbird";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const identity = getNetBirdIdentity(request.headers);
  if (!hasNetBirdIdentity(identity)) return new NextResponse("Forbidden", { status: 403 });
  const segments = (await params).path;
  if (segments.length !== 2 || !(segments[0] in { images: true, references: true })) {
    return new NextResponse("Not found", { status: 404 });
  }
  const folder = segments[0] as MediaFolder;
  const safePath = mediaPath(folder, basename(segments[1]));
  if (!safePath) return new NextResponse("Not found", { status: 404 });
  const mediaUrl = `/api/media/${folder}/${basename(segments[1])}`;
  const record = folder === "images" ? getGenerationByImageUrl(mediaUrl) : getUploadByUrl(mediaUrl);
  if (!record || !canAccessOwnedRecord(record, identity)) return new NextResponse("Not found", { status: 404 });
  try {
    const file = await readFile(safePath);
    return new NextResponse(file, {
      headers: { "Content-Type": CONTENT_TYPES[extname(safePath).toLowerCase()] || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
