import { NextRequest, NextResponse } from "next/server";
import { readMediaUrl } from "@/lib/localMedia";
import { getGenerationByImageUrl, getUploadByUrl } from "@/lib/localDb";
import { canAccessOwnedRecord } from "@/lib/galleryAccess";
import { getNetBirdIdentity, hasNetBirdIdentity } from "@/lib/netbird";

export async function GET(request: NextRequest) {
  const identity = getNetBirdIdentity(request.headers);
  if (!hasNetBirdIdentity(identity)) return new NextResponse("Forbidden", { status: 403 });
  const url = request.nextUrl.searchParams.get("url");
  const filename = (request.nextUrl.searchParams.get("filename") || "image.png").replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!url || !url.startsWith("/api/media/")) return new NextResponse("Forbidden", { status: 403 });
  const record = getGenerationByImageUrl(url) || getUploadByUrl(url);
  if (!record || !canAccessOwnedRecord(record, identity)) return new NextResponse("Not found", { status: 404 });
  try {
    const { buffer, extension } = await readMediaUrl(url);
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": `image/${extension === "jpg" ? "jpeg" : extension}`, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
  } catch { return new NextResponse("Not found", { status: 404 }); }
}
