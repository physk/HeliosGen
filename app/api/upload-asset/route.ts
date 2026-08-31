import { NextRequest, NextResponse } from "next/server";
import { addUpload } from "@/lib/localDb";
import { saveMedia } from "@/lib/localMedia";
import { getNetBirdIdentity, hasNetBirdIdentity } from "@/lib/netbird";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const identity = getNetBirdIdentity(request.headers);
  if (!hasNetBirdIdentity(identity)) return NextResponse.json({ error: "NetBird identity is required" }, { status: 403 });
  const mimeType = request.headers.get("content-type") || "application/octet-stream";
  if (!mimeType.startsWith("image/")) return NextResponse.json({ error: "Only image references are supported" }, { status: 415 });
  const buffer = Buffer.from(await request.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_BYTES) return NextResponse.json({ error: "Image must be between 1 byte and 25 MB" }, { status: 413 });
  try {
    const url = await saveMedia(buffer, mimeType, "references");
    addUpload({ url, mime_type: mimeType, owner: identity.user });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
