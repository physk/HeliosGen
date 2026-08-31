import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { codexLoginStore } from "@/lib/codexLoginStore";

const lifetime = 16 * 60 * 1000;
const env = () => ({ ...process.env, CODEX_HOME: process.env.CODEX_HOME || "/data/codex" });
const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");
const authFile = () => `${process.env.CODEX_HOME || "/data/codex"}/auth.json`;

function isLoggedIn(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("codex", ["login", "status"], { env: env() });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(
      existsSync(authFile()) || (code === 0 && /logged in|authenticated|successfully/im.test(stripAnsi(output)) && !/not logged in/im.test(stripAnsi(output))),
    ));
  });
}

export async function GET() { return NextResponse.json(codexLoginStore.get()); }

export async function POST() {
  const current = codexLoginStore.get();
  if (current.status === "pending" && Date.now() - current.startedAt < lifetime) return NextResponse.json(current);
  const result = await new Promise<CodexLoginState>((resolve) => {
    let output = "";
    let settled = false;
    const child = spawn("codex", ["login", "--device-auth"], { env: env() });
    const parse = () => {
      if (settled) return;
      const clean = stripAnsi(output);
      const url = clean.match(/https:\/\/\S+/)?.[0];
      const code = clean.match(/\b([A-Z0-9]{4}-[A-Z0-9]{4,8})\b/)?.[1];
      if (url && code) {
        settled = true;
        const state = { status: "pending" as const, url, code, startedAt: Date.now() };
        codexLoginStore.set(state);
        resolve(state);
      }
    };
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); parse(); });
    child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString(); parse(); });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      const state = { status: "error" as const, error: `Unable to start Codex: ${error.message}` };
      codexLoginStore.set(state); resolve(state);
    });
    child.on("close", async (code) => {
      const state = await isLoggedIn() ? { status: "success" as const } : { status: "error" as const, error: stripAnsi(output).trim().slice(-400) || `Codex login exited with code ${code}` };
      codexLoginStore.set(state);
    });
    setTimeout(() => {
      if (settled) return;
      settled = true;
      const state = { status: "error" as const, error: "Timed out waiting for Codex to provide device authorization details." };
      codexLoginStore.set(state); resolve(state);
    }, 10_000);
  });
  return NextResponse.json(result);
}

export async function DELETE() {
  await new Promise<void>((resolve) => {
    const child = spawn("codex", ["logout"], { env: env() });
    child.on("error", () => resolve());
    child.on("close", () => resolve());
  });
  codexLoginStore.set({ status: "idle" });
  return NextResponse.json({ status: "idle" });
}

type CodexLoginState = import("@/lib/codexLoginStore").CodexLoginState;
