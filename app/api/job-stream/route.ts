import { NextRequest } from "next/server";
import { jobStore, type JobResult } from "@/lib/jobStore";
import { jobEvents } from "@/lib/jobEvents";
import { getGeneration } from "@/lib/localDb";
import { canAccessOwnedRecord } from "@/lib/galleryAccess";
import { getNetBirdIdentity, hasNetBirdIdentity } from "@/lib/netbird";

const headers = { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" };

function immediate(result: JobResult): Response {
  return new Response(`data: ${JSON.stringify(result)}\n\n`, { headers });
}

export async function GET(request: NextRequest) {
  const identity = getNetBirdIdentity(request.headers);
  if (!hasNetBirdIdentity(identity)) return new Response("NetBird identity is required", { status: 403 });
  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) return new Response("taskId required", { status: 400 });
  const generation = getGeneration(taskId);
  if (generation && !canAccessOwnedRecord(generation, identity)) return new Response("Generation not found", { status: 404 });
  const current = jobStore.get(taskId);
  if (!current || current.status !== "pending") return immediate(current || { status: "error", error: "Job not found" });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const finish = (result: JobResult) => {
        if (closed) return;
        closed = true;
        clearTimeout(timeout);
        jobEvents.off(`job:${taskId}`, finish);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
        controller.close();
      };
      const timeout = setTimeout(() => finish({ status: "error", error: "Generation timed out" }), 12 * 60 * 1000);
      jobEvents.once(`job:${taskId}`, finish);
      request.signal.addEventListener("abort", () => { jobEvents.off(`job:${taskId}`, finish); if (!closed) { closed = true; clearTimeout(timeout); controller.close(); } });
    },
  });
  return new Response(stream, { headers });
}
