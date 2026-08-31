import { NextRequest, NextResponse } from "next/server";
import { getGeneration } from "@/lib/localDb";
import { jobStore } from "@/lib/jobStore";

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  const current = jobStore.get(taskId);
  if (current) return NextResponse.json(current);
  const generation = getGeneration(taskId);
  if (!generation) return NextResponse.json({ status: "not_found" });
  const result = generation.status === "done" && generation.image_url ? { status: "done" as const, imageUrl: generation.image_url } : generation.status === "error" ? { status: "error" as const, error: generation.error_msg || "Generation failed" } : { status: "pending" as const, type: "image" as const };
  jobStore.set(taskId, result);
  return NextResponse.json(result);
}
