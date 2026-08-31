import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "./localDb";

export type CodexLoginState =
  | { status: "idle" }
  | { status: "pending"; url: string; code: string; startedAt: number }
  | { status: "success" }
  | { status: "error"; error: string };

const FILE = join(DATA_DIR, "codex", "login-state.json");

export const codexLoginStore = {
  get(): CodexLoginState {
    if (!existsSync(FILE)) return { status: "idle" };
    try { return JSON.parse(readFileSync(FILE, "utf8")); } catch { return { status: "idle" }; }
  },
  set(state: CodexLoginState): void {
    mkdirSync(join(DATA_DIR, "codex"), { recursive: true });
    writeFileSync(FILE, JSON.stringify(state), "utf8");
  },
};
