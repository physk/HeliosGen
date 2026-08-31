"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PickerItem = { id: string; url: string; source: "generation" | "upload"; created_at: string };

const SHIMMER_CSS = `@keyframes picker-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}@keyframes picker-dropIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}`;

function PickerImage({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return <div style={{ position: "absolute", inset: 0 }}>
    {!loaded && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#1e2023 25%,#2a2d31 50%,#1e2023 75%)", backgroundSize: "200% 100%", animation: "picker-shimmer 1.4s ease-in-out infinite" }} />}
    <img src={src} alt="" loading="lazy" decoding="async" onLoad={() => setLoaded(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity 180ms ease" }} />
  </div>;
}

export function MediaPickerModal({ open, onClose, onPickUrl, onDeselect, onUpload, selectedUrls = [], maxCount, anchorRef }: {
  open: boolean;
  onClose: () => void;
  onPickUrl: (url: string) => void;
  onDeselect?: (url: string) => void;
  onUpload?: () => void;
  selectedUrls?: string[];
  maxCount?: number;
  anchorRef?: React.RefObject<HTMLElement | null>;
}) {
  const [activeTab, setActiveTab] = useState<"generation" | "upload">("generation");
  const [items, setItems] = useState<PickerItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pos, setPos] = useState({ left: 0, bottom: 0, width: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadItems = useCallback(async () => {
    setFetching(true);
    try {
      const response = await fetch(`/api/gallery?page=0&source=${activeTab === "upload" ? "uploaded" : "generated"}`);
      if (!response.ok) return;
      const data = await response.json() as { items?: PickerItem[] };
      setItems(data.items || []);
    } finally { setFetching(false); }
  }, [activeTab]);

  // Opening the picker intentionally refreshes its gallery contents.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) void loadItems(); else setUrlInput(""); }, [open, loadItems]);
  useEffect(() => {
    if (!open || !anchorRef?.current) return;
    const update = () => { const rect = anchorRef.current!.getBoundingClientRect(); setPos({ left: rect.left, bottom: window.innerHeight - rect.top + 6, width: rect.width }); };
    update(); window.addEventListener("resize", update); window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, anchorRef]);

  async function attachUrl() {
    const value = urlInput.trim();
    if (!value || urlLoading) return;
    setUrlLoading(true); setUrlError("");
    try {
      const response = await fetch("/api/fetch-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: value }) });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Unable to fetch image");
      onPickUrl(data.url); onClose();
    } catch (error) { setUrlError(error instanceof Error ? error.message : "Unable to fetch image"); }
    finally { setUrlLoading(false); }
  }

  const displayed = useMemo(() => items.filter((item) => item.source === activeTab), [activeTab, items]);
  if (!open) return null;
  const modal = <div data-media-picker-overlay="" style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
    <style>{SHIMMER_CSS}</style>
    <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "absolute", inset: 0, pointerEvents: "auto" }} />
    <div style={{ position: "fixed", left: pos.width ? pos.left : "50%", top: pos.width ? "auto" : "50%", bottom: pos.width ? pos.bottom : "auto", transform: pos.width ? "none" : "translate(-50%,-50%)", width: pos.width || "min(660px,calc(100vw - 32px))", height: pos.width ? 88 + 0.25 * (pos.width - 64) : 520, background: "rgba(14,16,18,.92)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,.9),0 0 0 1px rgba(255,255,255,.04)", pointerEvents: "auto", animation: "picker-dropIn 160ms cubic-bezier(.16,1,.3,1)" }}>
      <div style={{ padding: "14px 18px 12px", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        {[{ id: "generation" as const, label: "Image Generations" }, { id: "upload" as const, label: "Uploads" }].map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} style={{ padding: "6px 16px", borderRadius: 100, border: 0, cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, background: activeTab === tab.id ? "#fff" : "transparent", color: activeTab === tab.id ? "#0B0E14" : "rgba(255,255,255,.5)" }}>{tab.label}</button>)}
        {maxCount !== undefined && <span style={{ marginLeft: 8, fontSize: 11, padding: "3px 8px", borderRadius: 100, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.4)" }}>{selectedUrls.length}/{maxCount}</span>}
        <button type="button" onClick={onClose} aria-label="Close image picker" style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: "50%", border: 0, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.6)", cursor: "pointer" }}>×</button>
      </div>
      <div style={{ padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,.06)" }}><div style={{ display: "flex", gap: 8 }}><input type="url" placeholder="Paste an image URL…" value={urlInput} onChange={(event) => { setUrlInput(event.target.value); setUrlError(""); }} onKeyDown={(event) => { if (event.key === "Enter") void attachUrl(); }} style={{ flex: 1, height: 32, padding: "0 12px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "rgba(255,255,255,.85)", fontSize: 12, outline: 0 }} /><button type="button" onClick={() => void attachUrl()} disabled={!urlInput.trim() || urlLoading} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: 0, background: "rgba(45,212,191,.18)", color: "#2DD4BF", fontSize: 12, cursor: "pointer" }}>{urlLoading ? "…" : "Attach"}</button></div>{urlError && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#f87171" }}>{urlError}</p>}</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 18px 18px" }}>{fetching && displayed.length === 0 ? <div style={{ display: "grid", placeItems: "center", height: 200 }}><span style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(255,255,255,.1)", borderTopColor: "#2DD4BF", animation: "spin .75s linear infinite" }} /></div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 4 }}>{onUpload && <button type="button" onClick={onUpload} style={{ aspectRatio: "1", borderRadius: 8, border: "1.5px dashed rgba(255,255,255,.16)", background: "rgba(255,255,255,.025)", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 10 }}>＋<br />Upload</button>}{displayed.map((item) => { const selected = selectedUrls.includes(item.url); const disabled = !selected && maxCount !== undefined && selectedUrls.length >= maxCount; return <button type="button" key={item.id} onClick={() => selected ? onDeselect?.(item.url) : !disabled && onPickUrl(item.url)} onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", padding: 0, background: "#1a1c1f", border: selected ? "2px solid #2DD4BF" : hovered === item.id ? "2px solid rgba(255,255,255,.5)" : "2px solid transparent", opacity: disabled ? .35 : 1, cursor: disabled ? "not-allowed" : "pointer", transform: hovered === item.id ? "scale(1.04)" : "scale(1)", transition: "border-color 110ms,transform 110ms,opacity 110ms" }}><PickerImage src={item.url} />{selected && <span style={{ position: "absolute", right: 5, bottom: 5, width: 16, height: 16, display: "grid", placeItems: "center", borderRadius: "50%", color: "#062522", background: "#2DD4BF", fontSize: 12 }}>✓</span>}</button>; })}{displayed.length === 0 && <div style={{ gridColumn: "1/-1", padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,.22)", fontSize: 13 }}>Nothing here yet</div>}</div>}</div>
    </div>
  </div>;
  return createPortal(modal, document.body);
}
