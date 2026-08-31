import { NextRequest, NextResponse } from "next/server";
import { addUpload } from "@/lib/localDb";
import { readMediaUrl, saveMedia } from "@/lib/localMedia";

export async function POST(request: NextRequest) {
  const body = await request.json() as { url?: string };
  if (!body.url || !/^https?:\/\//i.test(body.url)) return NextResponse.json({ error: "A valid http(s) image URL is required" }, { status: 400 });
  try {
    const image = await readMediaUrl(body.url);
    const url = await saveMedia(image.buffer, "image/png", "references");
    addUpload({ url, mime_type: "image/png" });
    return NextResponse.json({ url });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to fetch image" }, { status: 400 }); }
}
