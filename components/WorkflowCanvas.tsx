"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Play, Plus, Save, Sparkles } from "lucide-react";
import { getActiveWorkflow, useWorkflowStore } from "@/lib/store";

export default function WorkflowCanvas() {
  const workflow = useWorkflowStore(getActiveWorkflow);
  const addNode = useWorkflowStore((state) => state.addNode);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const [running, setRunning] = useState(false);

  if (!workflow) return <div className="grid min-h-screen place-items-center bg-[#0b0d11] text-sm text-white/45">Workflow not found.</div>;
  const currentWorkflow = workflow;

  async function run() {
    const prompt = currentWorkflow.nodes.find((node) => node.type === "prompt")?.value || "";
    const refs = currentWorkflow.nodes.filter((node) => node.type === "reference" && node.imageUrl).map((node) => node.imageUrl!);
    if (!prompt.trim()) return;
    setRunning(true);
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, imageUrls: refs, aspectRatio: "1:1", quality: "auto" }) });
      const data = await response.json() as { taskId?: string; error?: string };
      if (!response.ok || !data.taskId) throw new Error(data.error || "Generation failed");
      let result: { status: string; imageUrl?: string } = { status: "pending" };
      for (let attempt = 0; attempt < 120 && result.status === "pending"; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        result = await fetch(`/api/job-status?taskId=${data.taskId}`).then((res) => res.json());
      }
      if (result.imageUrl) {
        const output = currentWorkflow.nodes.find((node) => node.type === "image");
        if (output) updateNode(output.id, result.imageUrl, result.imageUrl);
      }
    } finally { setRunning(false); }
  }

  return (
    <main className="min-h-screen bg-[#0b0d11] px-5 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/workflow" className="grid size-9 place-items-center rounded-lg border border-white/10 text-white/50 hover:text-white" aria-label="Back to workflows"><ArrowLeft className="size-4" /></Link>
          <div className="flex-1"><p className="text-[11px] uppercase tracking-[0.18em] text-white/30">Retained workflow</p><h1 className="mt-1 text-lg font-medium">{currentWorkflow.name}</h1></div>
          <button type="button" onClick={() => void run()} disabled={running} className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-300 px-4 text-xs font-semibold text-[#062522] disabled:opacity-40"><Play className="size-3.5" />{running ? "Running…" : "Run Codex"}</button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {currentWorkflow.nodes.map((node) => (
            <section key={node.id} className="rounded-xl border border-white/10 bg-[#11151c] p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-white/65"><span className="text-teal-200">{node.type === "prompt" ? <Sparkles className="size-4" /> : node.type === "reference" ? <ImagePlus className="size-4" /> : <Save className="size-4" />}</span>{node.title}</div>
              {node.type === "prompt" && <textarea value={node.value} onChange={(e) => updateNode(node.id, e.target.value)} placeholder="Describe the image…" className="mt-4 min-h-40 w-full resize-y rounded-lg border border-white/10 bg-[#0b0e13] p-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-teal-300/50" />}
              {node.type === "reference" && <div className="mt-4"><input type="url" value={node.imageUrl || ""} onChange={(e) => updateNode(node.id, e.target.value, e.target.value)} placeholder="Local image URL" className="h-10 w-full rounded-lg border border-white/10 bg-[#0b0e13] px-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-teal-300/50" />{node.imageUrl && <img src={node.imageUrl} alt="Reference" className="mt-3 aspect-square w-full rounded-lg object-cover" />}</div>}
              {node.type === "image" && (node.imageUrl ? <img src={node.imageUrl} alt="Generated result" className="mt-4 aspect-square w-full rounded-lg object-cover" /> : <div className="mt-4 grid aspect-square place-items-center rounded-lg border border-dashed border-white/10 text-xs text-white/25">Output appears here</div>)}
            </section>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => addNode("reference")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-white/55 hover:text-white"><Plus className="size-3.5" /> Reference image</button><button type="button" onClick={() => addNode("prompt")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-white/55 hover:text-white"><Plus className="size-3.5" /> Prompt step</button></div>
      </div>
    </main>
  );
}
