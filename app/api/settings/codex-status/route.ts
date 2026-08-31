import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { codexLoginStore } from "@/lib/codexLoginStore";

function commandAvailable(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env: { ...process.env, CODEX_HOME: process.env.CODEX_HOME || "/data/codex" } });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function GET() {
  const home = process.env.CODEX_HOME || "/data/codex";
  const [codexInstalled, imagegenInstalled] = await Promise.all([
    commandAvailable("codex", ["--version"]),
    commandAvailable("codex-imagegen", ["--version"]),
  ]);
  const authFound = existsSync(`${home}/auth.json`);
  const stored = codexLoginStore.get();
  const status = authFound
    ? { status: "success" as const }
    : stored.status === "pending" || stored.status === "error"
      ? stored
      : { status: "idle" as const };
  return NextResponse.json({ status, codexInstalled, imagegenInstalled, authFound });
}
