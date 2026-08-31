"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ImagePlus, Maximize2, Minimize2, Plus, X } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import DotCanvasBackground from "@/components/ui/DotCanvasBackground";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

type ImageItem = {
  id: string;
  url: string;
  source: "generation" | "upload";
  created_at: string;
  prompt?: string;
  aspect_ratio?: string;
  quality?: string;
  referenceImageUrls?: string[];
};

type Reference = { id: string; url: string; uploading?: boolean; error?: string };
type Pending = { id: string; prompt: string; refs: string[]; status: "pending" | "generating" | "error"; error?: string };

const EMPTY_IMAGES = ["/1.webp", "/2.webp", "/3.webp", "/4.webp"];
const RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const QUALITIES = ["auto", "low", "medium", "high"];

function EmptyFan({ blur = false }: { blur?: boolean }) {
  const cards = [
    { rotate: "-10deg", rounded: false, margin: "clamp(-36px,-1.5vw,-16px)", z: 4 },
    { rotate: "4deg", rounded: false, margin: "clamp(-36px,-1.5vw,-16px)", z: 3 },
    { rotate: "180deg", rounded: true, margin: "clamp(-36px,-1.5vw,-16px)", z: 2 },
    { rotate: "-4deg", rounded: false, margin: "0", z: 1 },
  ];
  return <div style={{ display: "flex", alignItems: "center", position: blur ? "absolute" : undefined, left: blur ? "50%" : undefined, top: blur ? 0 : undefined, transform: blur ? "translateX(-50%)" : undefined, filter: blur ? "blur(32px)" : undefined, opacity: blur ? 0.4 : 1 }}>
    {cards.map((card, index) => <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: card.margin, zIndex: card.z }}>
      <div style={{ transform: `rotate(${card.rotate})${card.rounded ? " scaleY(-1)" : ""}` }}>
        <div style={{ position: "relative", overflow: "hidden", width: "clamp(64px,min(12vw,16vh),172px)", height: "clamp(64px,min(12vw,16vh),172px)", borderRadius: card.rounded ? "50%" : "12px", border: "3px solid rgba(45,212,191,0.75)", boxShadow: "0 0 14px rgba(45,212,191,0.35), 0 0 4px rgba(45,212,191,0.2)" }}>
          <img src={EMPTY_IMAGES[index]} alt="" style={{ objectFit: "cover", width: "100%", height: "100%", display: "block" }} />
        </div>
      </div>
    </div>)}
  </div>;
}

function EmptyState() {
  return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "320px" }}>
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px,2.5vh,32px)", alignItems: "center", width: "100%", position: "relative" }}>
      <EmptyFan blur /><EmptyFan />
    </div>
  </div>;
}

function PendingTile({ item }: { item: Pending }) {
  return <div style={{ position: "relative", overflow: "hidden", aspectRatio: "1 / 1", borderRadius: 12, background: "#11151b", border: "1px solid rgba(255,255,255,0.08)" }}>
    <div style={{ position: "absolute", top: "-40%", left: "50%", transform: "translateX(-50%)", width: "180%", height: "80%", background: "radial-gradient(ellipse at 50% 20%, rgba(20,160,140,0.45), rgba(30,100,200,0.2) 40%, transparent 70%)", animation: "pendingGlow 3s ease-in-out infinite" }} />
    <div style={{ position: "absolute", inset: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 }}>
      <span style={{ borderRadius: 999, padding: "6px 10px", background: "rgba(0,0,0,.58)", color: item.status === "error" ? "#f87171" : "#2DD4BF", fontSize: 11 }}>{item.status === "pending" ? "Pending" : item.status === "error" ? "Failed" : "Generating…"}</span>
    </div>
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 10px 10px", background: "linear-gradient(to top, rgba(0,0,0,.65), transparent)" }}><p style={{ margin: 0, color: "rgba(255,255,255,.4)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.error || item.prompt}</p></div>
  </div>;
}

function GalleryCard({ item, onOpen }: { item: ImageItem; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} style={{ position: "relative", display: "block", overflow: "hidden", width: "100%", aspectRatio: item.aspect_ratio?.replace(":", " /") || "4 / 3", border: 0, borderRadius: 12, padding: 0, background: "#14171c", cursor: "pointer" }}>
    <img src={item.url} alt={item.prompt || "Generated image"} loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
  </button>;
}

function GalleryInner() {
  const { state } = useSidebar();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") === "uploaded" ? "uploaded" : "generated";
  const [items, setItems] = useState<ImageItem[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<Reference[]>([]);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("auto");
  const [count, setCount] = useState(1);
  const [zoom, setZoom] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<ImageItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadGallery = useCallback(async () => {
    const response = await fetch(`/api/gallery?page=0&source=${source === "uploaded" ? "uploaded" : "generated"}`);
    if (!response.ok) return;
    const data = await response.json() as { items?: ImageItem[] };
    setItems(data.items || []);
  }, [source]);

  useEffect(() => { void loadGallery(); }, [loadGallery]);
  useEffect(() => { localStorage.setItem("aiui-gallery-zoom", String(zoom)); }, [zoom]);
  useEffect(() => { const saved = localStorage.getItem("aiui-gallery-zoom"); if (saved) setZoom(Number(saved)); }, []);

  function resizePrompt() {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 264)}px`;
  }

  async function uploadReference(file: File) {
    const id = `${file.name}-${file.lastModified}`;
    setReferences((current) => [...current, { id, url: URL.createObjectURL(file), uploading: true }]);
    try {
      const response = await fetch("/api/upload-asset", { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed");
      setReferences((current) => current.map((ref) => ref.id === id ? { ...ref, url: data.url!, uploading: false } : ref));
    } catch (uploadError) {
      setReferences((current) => current.map((ref) => ref.id === id ? { ...ref, uploading: false, error: uploadError instanceof Error ? uploadError.message : "Upload failed" } : ref));
    }
  }

  async function generate() {
    const text = prompt.trim();
    if (!text || loading) return;
    const readyRefs = references.filter((ref) => !ref.uploading && !ref.error).map((ref) => ref.url);
    if (readyRefs.length !== references.length) { setError("Images are still uploading…"); return; }
    setError("");
    const batch = Array.from({ length: count }, (_, index) => ({ id: `${Date.now()}-${index}`, prompt: text, refs: readyRefs, status: "pending" as const }));
    setPending((current) => [...batch, ...current]);
    setLoading(true);
    try {
      for (const job of batch) {
        setPending((current) => current.map((item) => item.id === job.id ? { ...item, status: "generating" } : item));
        const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text, imageUrls: readyRefs, aspectRatio, quality }) });
        const data = await response.json() as { taskId?: string; error?: string };
        if (!response.ok || !data.taskId) throw new Error(data.error || "Generation failed");
        let done = false;
        for (let attempt = 0; attempt < 200 && !done; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const status = await fetch(`/api/job-status?taskId=${encodeURIComponent(data.taskId!)}`).then((result) => result.json()) as { status: string; error?: string };
          if (status.status === "error") throw new Error(status.error || "Generation failed");
          done = status.status === "done";
        }
        if (!done) throw new Error("Generation timed out");
        setPending((current) => current.filter((item) => item.id !== job.id));
        await loadGallery();
      }
      setPrompt("");
      setReferences([]);
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : "Generation failed";
      setError(message);
      setPending((current) => current.map((item) => item.status === "generating" ? { ...item, status: "error", error: message } : item));
    } finally { setLoading(false); }
  }

  const columns = Math.max(2, Math.min(8, zoom));
  return <div style={{ flex: 1, background: "#0B0E14", display: "flex", flexDirection: "column", overflow: "hidden", color: "#fff", position: "relative" }}>
    <DotCanvasBackground />
    <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", height: 48, padding: "0 18px", borderBottom: "1px solid rgba(255,255,255,.06)", opacity: state === "collapsed" ? 1 : 0.95 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 12 }}><a href="/gallery?tab=images&source=generated" style={{ color: source === "generated" ? "#fff" : "rgba(255,255,255,.35)", textDecoration: "none" }}>Generated</a><a href="/gallery?tab=images&source=uploaded" style={{ color: source === "uploaded" ? "#fff" : "rgba(255,255,255,.35)", textDecoration: "none" }}>Uploaded</a></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.4)", fontSize: 11 }}><Minimize2 size={13} /><input aria-label="Gallery zoom" type="range" min="2" max="8" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} style={{ width: 74, accentColor: "#2DD4BF" }} /><Maximize2 size={13} /></div>
    </div>
    <div style={{ position: "relative", zIndex: 1, flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 18px 270px" }}>
      {pending.length + items.length === 0 ? <EmptyState /> : <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 12 }}>{pending.map((item) => <PendingTile key={item.id} item={item} />)}{items.map((item) => <GalleryCard key={`${item.source}-${item.id}`} item={item} onOpen={() => setLightbox(item)} />)}</div>}
    </div>
    <div style={{ position: "absolute", zIndex: 4, left: "50%", bottom: 24, transform: "translateX(-50%)", width: "min(760px, calc(100% - 32px))" }}>
      {error && <div role="alert" style={{ marginBottom: 8, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(248,113,113,.25)", background: "rgba(16,18,20,.97)", color: "#f87171", fontSize: 12 }}>{error}</div>}
      <div style={{ overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, background: "rgba(16,18,20,.94)", boxShadow: "0 16px 60px rgba(0,0,0,.5)", backdropFilter: "blur(20px)" }}>
        {references.length > 0 && <div style={{ display: "flex", gap: 8, padding: "12px 14px 0", overflowX: "auto" }}>{references.map((ref) => <div key={ref.id} style={{ position: "relative", width: 58, height: 58, flexShrink: 0, borderRadius: 8, overflow: "hidden", border: ref.error ? "1px solid #f87171" : "1px solid rgba(255,255,255,.15)" }}><img src={ref.url} alt="Reference" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: ref.uploading ? .45 : 1 }} /><button type="button" onClick={() => setReferences((current) => current.filter((item) => item.id !== ref.id))} aria-label="Remove reference" style={{ position: "absolute", top: 3, right: 3, display: "grid", placeItems: "center", width: 18, height: 18, border: 0, borderRadius: "50%", color: "#fff", background: "rgba(0,0,0,.7)", cursor: "pointer" }}><X size={11} /></button></div>)}</div>}
        <textarea ref={inputRef} data-prompt-input value={prompt} onChange={(event) => { setPrompt(event.target.value); resizePrompt(); }} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void generate(); } }} placeholder="Describe the scene you imagine…" rows={1} style={{ display: "block", width: "100%", minHeight: 54, maxHeight: 264, resize: "none", outline: 0, border: 0, padding: references.length ? "12px 16px 4px" : "16px", background: "transparent", color: "#e8e8e6", font: "14px/1.5 inherit" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px 10px" }}>
          <button type="button" onClick={() => fileInputRef.current?.click()} title="Add reference image" style={{ display: "grid", placeItems: "center", width: 34, height: 34, border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, color: "rgba(255,255,255,.58)", background: "rgba(255,255,255,.04)", cursor: "pointer" }}><ImagePlus size={16} /></button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => { Array.from(event.target.files || []).slice(0, 5 - references.length).forEach((file) => void uploadReference(file)); event.target.value = ""; }} />
          <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} aria-label="Aspect ratio" style={{ height: 34, padding: "0 9px", border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, color: "rgba(255,255,255,.62)", background: "#171a20", fontSize: 11, outline: 0 }}>{RATIOS.map((ratio) => <option key={ratio}>{ratio}</option>)}</select>
          <select value={quality} onChange={(event) => setQuality(event.target.value)} aria-label="Quality" style={{ height: 34, padding: "0 9px", border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, color: "rgba(255,255,255,.62)", background: "#171a20", fontSize: 11, outline: 0 }}>{QUALITIES.map((value) => <option key={value}>{value}</option>)}</select>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", color: "rgba(255,255,255,.5)", fontSize: 11 }}><button type="button" onClick={() => setCount((value) => Math.max(1, value - 1))} style={{ border: 0, background: "none", color: "inherit", cursor: "pointer" }}>−</button><span style={{ minWidth: 14, textAlign: "center" }}>{count}</span><button type="button" onClick={() => setCount((value) => Math.min(4, value + 1))} style={{ border: 0, background: "none", color: "inherit", cursor: "pointer" }}>+</button></div>
          <button type="button" onClick={() => void generate()} disabled={loading || !prompt.trim()} style={{ display: "flex", alignItems: "center", gap: 7, height: 34, padding: "0 13px", border: 0, borderRadius: 9, color: "#062522", background: loading || !prompt.trim() ? "rgba(45,212,191,.35)" : "#2DD4BF", fontSize: 12, fontWeight: 600, cursor: loading || !prompt.trim() ? "default" : "pointer" }}>{loading ? "Generating…" : "Generate"}<Plus size={14} /></button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 7, color: "rgba(255,255,255,.25)", fontSize: 10 }}><KbdGroup><Kbd>⌘</Kbd><Kbd>↵</Kbd></KbdGroup><span style={{ marginLeft: 6 }}>to generate</span></div>
    </div>
    {lightbox && <div role="dialog" aria-modal="true" onClick={() => setLightbox(null)} style={{ position: "fixed", zIndex: 20, inset: 0, display: "grid", placeItems: "center", padding: 24, background: "rgba(0,0,0,.82)" }}><button type="button" aria-label="Close preview" onClick={() => setLightbox(null)} style={{ position: "fixed", top: 18, right: 18, display: "grid", placeItems: "center", width: 34, height: 34, border: "1px solid rgba(255,255,255,.12)", borderRadius: "50%", color: "#fff", background: "rgba(0,0,0,.5)" }}><X size={15} /></button><img src={lightbox.url} alt={lightbox.prompt || "Generated image"} onClick={(event) => event.stopPropagation()} style={{ maxWidth: "min(92vw, 1200px)", maxHeight: "86vh", objectFit: "contain", borderRadius: 12 }} /></div>}
    <style>{`[data-prompt-input]::placeholder{color:rgba(255,255,255,.3)} @keyframes pendingGlow{0%,100%{opacity:.55}50%{opacity:1}} select option{background:#171a20;color:#fff}`}</style>
  </div>;
}

export default function GalleryPage() {
  return <Suspense fallback={<div style={{ flex: 1, background: "#0B0E14" }} />}><GalleryInner /></Suspense>;
}
