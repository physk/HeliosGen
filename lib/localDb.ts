import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const DATA_DIR = process.env.HELIOS_DATA_DIR || join(process.cwd(), "data");
export const DB_DIR = join(DATA_DIR, "db");
export const IMAGE_DIR = join(DATA_DIR, "images");
export const REFERENCE_DIR = join(DATA_DIR, "references");

type Generation = {
  id: string;
  task_id: string;
  status: "pending" | "done" | "error";
  prompt: string;
  model: "codex-imagegen";
  aspect_ratio: string;
  quality: string;
  reference_image_urls: string[];
  image_url?: string;
  error_msg?: string;
  created_at: string;
  updated_at: string;
};

type Upload = {
  id: string;
  url: string;
  mime_type: string;
  created_at: string;
};

type Database = { generations: Generation[]; uploads: Upload[] };

const DB_FILE = join(DB_DIR, "heliosgen.json");

function blank(): Database {
  return { generations: [], uploads: [] };
}

function read(): Database {
  if (!existsSync(DB_FILE)) return blank();
  try {
    const parsed = JSON.parse(readFileSync(DB_FILE, "utf8")) as Partial<Database>;
    return {
      generations: Array.isArray(parsed.generations) ? parsed.generations : [],
      uploads: Array.isArray(parsed.uploads) ? parsed.uploads : [],
    };
  } catch {
    return blank();
  }
}

function write(db: Database): void {
  mkdirSync(DB_DIR, { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

export function createGeneration(data: Omit<Generation, "id" | "created_at" | "updated_at">): Generation {
  const db = read();
  const now = new Date().toISOString();
  const generation = { ...data, id: randomUUID(), created_at: now, updated_at: now };
  db.generations.push(generation);
  write(db);
  return generation;
}

export function updateGeneration(taskId: string, updates: Partial<Pick<Generation, "status" | "image_url" | "error_msg">>): void {
  const db = read();
  const generation = db.generations.find((item) => item.task_id === taskId);
  if (!generation) return;
  Object.assign(generation, updates, { updated_at: new Date().toISOString() });
  write(db);
}

export function getGeneration(taskId: string): Generation | undefined {
  return read().generations.find((item) => item.task_id === taskId);
}

export function getGenerations(): Generation[] {
  return read().generations
    .filter((item) => item.status === "done" && item.image_url)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function deleteGeneration(id: string): void {
  const db = read();
  db.generations = db.generations.filter((item) => item.id !== id);
  write(db);
}

export function addUpload(data: Omit<Upload, "id" | "created_at">): Upload {
  const db = read();
  const upload = { ...data, id: randomUUID(), created_at: new Date().toISOString() };
  db.uploads.push(upload);
  write(db);
  return upload;
}

export function getUploads(): Upload[] {
  return read().uploads.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function deleteUpload(id: string): void {
  const db = read();
  db.uploads = db.uploads.filter((item) => item.id !== id);
  write(db);
}
