import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, extname, join, normalize, relative } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { IMAGE_DIR, REFERENCE_DIR } from "./localDb";

const MEDIA_ROOTS = { images: IMAGE_DIR, references: REFERENCE_DIR } as const;
export type MediaFolder = keyof typeof MEDIA_ROOTS;

function extension(mimeType: string): string {
  if (mimeType.includes("jpeg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  return "png";
}

export function mediaPath(folder: MediaFolder, file: string): string | null {
  const root = MEDIA_ROOTS[folder];
  const candidate = normalize(join(root, file));
  const rel = relative(root, candidate);
  if (!rel || rel.startsWith("..") || rel.includes("..")) return null;
  return candidate;
}

export async function saveMedia(buffer: Buffer, mimeType: string, folder: MediaFolder): Promise<string> {
  const root = MEDIA_ROOTS[folder];
  await mkdir(root, { recursive: true });
  const filename = `${randomUUID()}.${extension(mimeType)}`;
  await writeFile(join(root, filename), buffer, { flag: "wx" });
  return `/api/media/${folder}/${filename}`;
}

export async function readMediaUrl(url: string): Promise<{ buffer: Buffer; extension: string }> {
  if (url.startsWith("/api/media/")) {
    const parts = url.split("/").filter(Boolean);
    if (parts.length !== 4 || !(parts[2] in MEDIA_ROOTS)) throw new Error("Invalid local media URL");
    const folder = parts[2] as MediaFolder;
    const safePath = mediaPath(folder, parts[3]);
    if (!safePath) throw new Error("Invalid local media path");
    return { buffer: await readFile(safePath), extension: extname(safePath).slice(1) || "png" };
  }
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!match) throw new Error("Invalid image data");
    return { buffer: Buffer.from(match[2], "base64"), extension: extension(match[1]) };
  }
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Unable to fetch reference image (${response.status})`);
  const contentType = response.headers.get("content-type") || "image/png";
  return { buffer: Buffer.from(await response.arrayBuffer()), extension: extension(contentType) };
}

export async function removeMedia(url: string): Promise<void> {
  if (!url.startsWith("/api/media/")) return;
  const parts = url.split("/").filter(Boolean);
  if (parts.length !== 4 || !(parts[2] in MEDIA_ROOTS)) return;
  const safePath = mediaPath(parts[2] as MediaFolder, basename(parts[3]));
  if (safePath && existsSync(safePath)) await unlink(safePath).catch(() => undefined);
}

export function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
