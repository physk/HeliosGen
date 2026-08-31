import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DB_DIR } from "./localDb";

export type JobResult =
  | { status: "pending"; type: "image" }
  | { status: "done"; imageUrl: string }
  | { status: "error"; error: string };

const FILE = join(DB_DIR, "jobs.json");

function read(): Record<string, JobResult> {
  if (!existsSync(FILE)) return {};
  try { return JSON.parse(readFileSync(FILE, "utf8")); } catch { return {}; }
}

function write(data: Record<string, JobResult>): void {
  mkdirSync(DB_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(data), "utf8");
}

export const jobStore = {
  get(taskId: string): JobResult | undefined { return read()[taskId]; },
  set(taskId: string, result: JobResult): void { const data = read(); data[taskId] = result; write(data); },
};
