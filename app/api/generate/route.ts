import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createGeneration, updateGeneration } from "@/lib/localDb";
import { readMediaUrl, saveMedia } from "@/lib/localMedia";
import { jobStore } from "@/lib/jobStore";
import { jobEvents } from "@/lib/jobEvents";
import { normalizeGenerateRequest } from "@/lib/generationRequest";
import { getNetBirdIdentity, hasNetBirdIdentity } from "@/lib/netbird";

const CODEX_SIZE_MAP: Record<string, string> = {
  auto: "auto", "1:1": "1024x1024", "16:9": "1536x1024", "9:16": "1024x1536", "4:3": "1536x1024", "3:4": "1024x1536",
};

function cleanCodexError(raw: string): string {
  const tail = (raw.match(/Error:\s*([\s\S]*)$/)?.[1] || raw).trim();
  const brace = tail.indexOf("{");
  if (brace !== -1) {
    try {
      const message = JSON.parse(tail.slice(brace))?.error?.message;
      if (typeof message === "string" && message) return message;
    } catch { /* Keep the plain CLI error. */ }
  }
  return (tail.split(";")[0] || raw).trim();
}

async function runCodexImagegen(options: { prompt: string; images: Array<{ buffer: Buffer; extension: string }>; size: string; quality: string }): Promise<Buffer> {
  const temporaryFiles: string[] = [];
  const outputPath = join(tmpdir(), `heliosgen-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  try {
    const imagePaths: string[] = [];
    for (const image of options.images.slice(0, 5)) {
      const path = join(tmpdir(), `heliosgen-ref-${Date.now()}-${Math.random().toString(36).slice(2)}.${image.extension}`);
      await writeFile(path, image.buffer, { flag: "wx" });
      temporaryFiles.push(path);
      imagePaths.push(path);
    }
    const args = imagePaths.length
      ? ["edit", ...imagePaths.flatMap((path) => ["--image", path]), "--prompt", options.prompt, "--size", options.size, "--quality", options.quality, "--out", outputPath, "--force"]
      : ["generate", "--prompt", options.prompt, "--size", options.size, "--quality", options.quality, "--out", outputPath, "--force"];

    const { code, stderr } = await new Promise<{ code: number; stderr: string }>((resolve, reject) => {
      const child = spawn("codex-imagegen", args, { env: { ...process.env, CODEX_HOME: process.env.CODEX_HOME || "/data/codex" } });
      let output = "";
      child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString(); });
      child.on("error", (error) => reject(new Error(`Unable to start codex-imagegen: ${error.message}`)));
      child.on("close", (exitCode) => resolve({ code: exitCode ?? -1, stderr: output }));
    });
    if (code !== 0) throw new Error(`codex-imagegen exited with code ${code}: ${stderr.slice(0, 1200) || "no stderr output"}`);
    return await readFile(outputPath);
  } finally {
    await Promise.all([...temporaryFiles, outputPath].map((path) => unlink(path).catch(() => undefined)));
  }
}

export const maxDuration = 1000;

export async function POST(request: NextRequest) {
  const identity = getNetBirdIdentity(request.headers);
  if (!hasNetBirdIdentity(identity)) return NextResponse.json({ error: "NetBird identity is required" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const input = normalizeGenerateRequest(body, identity);
  const { prompt, aspectRatio, quality, imageUrls } = input;
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  const taskId = `codex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  createGeneration({ task_id: taskId, status: "pending", prompt, model: "codex-imagegen", owner: input.owner, aspect_ratio: aspectRatio, quality, reference_image_urls: imageUrls });
  jobStore.set(taskId, { status: "pending", type: "image" });
  void (async () => {
    try {
      const images = await Promise.all(imageUrls.map(readMediaUrl));
      const promptWithRatio = `${prompt}${aspectRatio !== "auto" ? ` Aspect ratio: ${aspectRatio}.` : ""}`;
      const output = await runCodexImagegen({ prompt: promptWithRatio.slice(0, 8000), images, size: CODEX_SIZE_MAP[aspectRatio] || "auto", quality });
      const imageUrl = await saveMedia(output, "image/png", "images");
      updateGeneration(taskId, { status: "done", image_url: imageUrl });
      jobStore.set(taskId, { status: "done", imageUrl });
      jobEvents.emit(`job:${taskId}`, { status: "done", imageUrl });
    } catch (error) {
      const message = cleanCodexError(error instanceof Error ? error.message : String(error));
      updateGeneration(taskId, { status: "error", error_msg: message });
      jobStore.set(taskId, { status: "error", error: message });
      jobEvents.emit(`job:${taskId}`, { status: "error", error: message });
    }
  })();
  return NextResponse.json({ taskId, referenceImageUrls: imageUrls });
}
