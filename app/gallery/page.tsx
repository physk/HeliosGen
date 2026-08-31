"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, LoaderCircle, Plus, RefreshCw, Trash2, X } from "lucide-react";

type GalleryItem = {
  id: string;
  url: string;
  mediaType: "image";
  source: "generation" | "upload";
  prompt?: string;
  aspect_ratio?: string;
  quality?: string;
  created_at: string;
  referenceImageUrls?: string[];
};

const RATIOS = ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"];
const QUALITIES = ["auto", "low", "medium", "high"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function GalleryPage() {
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("1:1");
  const [quality, setQuality] = useState("auto");
  const [references, setReferences] = useState<string[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadGallery = useCallback(async () => {
    const response = await fetch("/api/gallery");
    if (!response.ok) throw new Error("Unable to load gallery");
    const data = await response.json() as { items: GalleryItem[] };
    setItems(data.items);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { loadGallery().catch((e) => setError(e.message)); }, 0); return () => window.clearTimeout(timer); }, [loadGallery]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 5 - references.length)) {
        if (!file.type.startsWith("image/")) continue;
        const response = await fetch("/api/upload-asset", { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const data = await response.json() as { url?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error || "Upload failed");
        uploaded.push(data.url);
      }
      setReferences((current) => [...current, ...uploaded].slice(0, 5));
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
  }

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, aspectRatio: ratio, quality, imageUrls: references }) });
      const data = await response.json() as { taskId?: string; error?: string };
      if (!response.ok || !data.taskId) throw new Error(data.error || "Generation could not be started");
      await new Promise<void>((resolve, reject) => {
        const stream = new EventSource(`/api/job-stream?taskId=${encodeURIComponent(data.taskId!)}`);
        stream.onmessage = (event) => {
          const result = JSON.parse(event.data) as { status: string; error?: string };
          stream.close();
          if (result.status === "error") reject(new Error(result.error || "Generation failed")); else resolve();
        };
        stream.onerror = () => { stream.close(); reject(new Error("Lost connection while waiting for the image")); };
      });
      setPrompt(""); setReferences([]); await loadGallery();
    } catch (e) { setError(e instanceof Error ? e.message : "Generation failed"); }
    finally { setBusy(false); }
  }

  async function remove(item: GalleryItem) {
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    await fetch("/api/gallery", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, source: item.source, url: item.url }) }).catch(() => loadGallery());
    if (selected?.id === item.id) setSelected(null);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-[#0b0d11]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-5 py-8 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-300/70">Codex image studio</p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Make an image.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">Describe a scene, add references when you need to edit or preserve details, and let Codex handle the rest.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/35"><span className="size-2 rounded-full bg-teal-300 shadow-[0_0_14px_rgba(94,234,212,0.8)]" /> Shared Codex workspace</div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-white/10 bg-[#11151c] p-4 shadow-2xl shadow-black/20 sm:p-5">
            <label htmlFor="prompt" className="mb-3 block text-xs font-medium text-white/55">Prompt</label>
            <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void generate(); }} placeholder="A quiet alpine observatory at blue hour, warm light in the windows…" className="min-h-36 w-full resize-y rounded-xl border border-white/10 bg-[#0b0e13] p-4 text-[15px] leading-7 text-white outline-none transition placeholder:text-white/25 focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/10" />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-white/20 px-3 text-xs font-medium text-white/65 transition hover:border-teal-300/50 hover:text-white"><ImagePlus className="size-4" /> Add references <span className="text-white/30">{references.length}/5</span></button>
              <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
              <span className="ml-auto hidden text-[11px] text-white/25 sm:block">⌘↵ to generate</span>
            </div>
            {references.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{references.map((url) => <div key={url} className="group relative size-16 overflow-hidden rounded-lg border border-white/15 bg-black"><img src={url} alt="Reference" className="size-full object-cover" /><button type="button" onClick={() => setReferences((current) => current.filter((item) => item !== url))} className="absolute right-1 top-1 hidden size-5 place-items-center rounded-full bg-black/75 text-white group-hover:grid" aria-label="Remove reference"><X className="size-3" /></button></div>)}</div>}
            {error && <p role="alert" className="mt-4 rounded-lg border border-red-300/20 bg-red-300/5 px-3 py-2 text-xs leading-5 text-red-200">{error}</p>}
            <div className="mt-5 flex justify-end"><button type="button" disabled={!prompt.trim() || busy} onClick={() => void generate()} className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-lg bg-teal-300 px-5 text-sm font-semibold text-[#062522] transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <><LoaderCircle className="size-4 animate-spin" /> Generating…</> : <><Plus className="size-4" /> Generate</>}</button></div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-[#11151c] p-4 sm:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Output</h2>
            <div className="mt-5 flex flex-col gap-5">
              <Control label="Aspect ratio"><div className="grid grid-cols-3 gap-1.5">{RATIOS.map((value) => <button type="button" key={value} onClick={() => setRatio(value)} className={`h-9 rounded-md border text-xs transition ${ratio === value ? "border-teal-300/70 bg-teal-300/10 text-teal-100" : "border-white/10 text-white/45 hover:border-white/25 hover:text-white"}`}>{value}</button>)}</div></Control>
              <Control label="Quality"><div className="grid grid-cols-4 gap-1.5">{QUALITIES.map((value) => <button type="button" key={value} onClick={() => setQuality(value)} className={`h-9 rounded-md border text-xs capitalize transition ${quality === value ? "border-teal-300/70 bg-teal-300/10 text-teal-100" : "border-white/10 text-white/45 hover:border-white/25 hover:text-white"}`}>{value}</button>)}</div></Control>
              <div className="border-t border-white/8 pt-4 text-xs leading-5 text-white/35">Codex supports up to five reference images. Images are kept in the local application volume.</div>
            </div>
          </aside>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-medium tracking-[-0.02em] text-white">Gallery</h2><p className="mt-1 text-xs text-white/35">Your local generation history and uploaded references.</p></div><button type="button" onClick={() => void loadGallery()} className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 text-white/45 transition hover:border-white/25 hover:text-white" aria-label="Refresh gallery"><RefreshCw className="size-4" /></button></div>
          {items.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] text-center"><div className="mb-3 grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-teal-200/70"><ImagePlus className="size-5" /></div><p className="text-sm text-white/60">Nothing here yet</p><p className="mt-1 text-xs text-white/30">Your first image will appear in this gallery.</p></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{items.map((item) => <GalleryCard key={item.id} item={item} onOpen={() => setSelected(item)} onDelete={() => void remove(item)} />)}</div>}
        </section>
      </div>
      {selected && <Lightbox item={selected} onClose={() => setSelected(null)} onDelete={() => void remove(selected)} />}
    </main>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) { return <div><p className="mb-2 text-xs text-white/45">{label}</p>{children}</div>; }

function GalleryCard({ item, onOpen, onDelete }: { item: GalleryItem; onOpen: () => void; onDelete: () => void }) {
  return <article className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#11151c] transition hover:border-teal-200/35"><button type="button" onClick={onOpen} className="block aspect-square w-full cursor-zoom-in bg-black"><img src={item.url} alt={item.prompt || "Generated image"} loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-[1.025]" /></button><div className="absolute inset-x-0 bottom-0 flex translate-y-1 items-end justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 pb-2 pt-8 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"><span className="truncate pr-2 text-[10px] text-white/60">{item.source === "generation" ? formatDate(item.created_at) : "Reference image"}</span><div className="flex gap-1"><a href={`/api/download?url=${encodeURIComponent(item.url)}&filename=heliosgen-${item.id}.png`} className="grid size-7 place-items-center rounded-md bg-black/50 text-white/75 hover:text-white" aria-label="Download image"><Download className="size-3.5" /></a><button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="grid size-7 place-items-center rounded-md bg-black/50 text-red-200/75 hover:text-red-100" aria-label="Delete image"><Trash2 className="size-3.5" /></button></div></div></article>;
}

function Lightbox({ item, onClose, onDelete }: { item: GalleryItem; onClose: () => void; onDelete: () => void }) {
  return <div role="dialog" aria-modal="true" aria-label="Image preview" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}><div className="flex max-h-full w-full max-w-5xl flex-col gap-4" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between text-white"><div><p className="text-sm font-medium">{item.source === "generation" ? "Codex generation" : "Reference image"}</p><p className="mt-1 text-xs text-white/40">{formatDate(item.created_at)}{item.aspect_ratio ? ` · ${item.aspect_ratio}` : ""}</p></div><div className="flex gap-2"><a href={`/api/download?url=${encodeURIComponent(item.url)}&filename=heliosgen-${item.id}.png`} className="grid size-9 place-items-center rounded-lg border border-white/15 text-white/70 hover:text-white" aria-label="Download image"><Download className="size-4" /></a><button type="button" onClick={onDelete} className="grid size-9 place-items-center rounded-lg border border-red-200/20 text-red-100/70 hover:text-red-100" aria-label="Delete image"><Trash2 className="size-4" /></button><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg border border-white/15 text-white/70 hover:text-white" aria-label="Close preview"><X className="size-4" /></button></div></div><div className="flex min-h-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#090b0f] p-2"><img src={item.url} alt={item.prompt || "Image preview"} className="max-h-[72vh] max-w-full object-contain" /></div>{item.prompt && <p className="max-h-24 overflow-auto rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/60">{item.prompt}</p>}</div></div>;
}
