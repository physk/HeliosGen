"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Workflow as WorkflowIcon } from "lucide-react";
import { useWorkflowStore } from "@/lib/store";

export default function WorkflowDashboard() {
  const router = useRouter();
  const workflows = useWorkflowStore((state) => state.workflows);
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);
  return <main className="min-h-screen bg-[#0b0d11] px-6 py-10 text-white"><div className="mx-auto max-w-4xl"><p className="text-[11px] uppercase tracking-[0.22em] text-white/35">Retained for later</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Workflows</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/45">A quiet workspace for chaining Codex image operations. This area is intentionally hidden from the primary navigation.</p><button type="button" onClick={() => router.push(`/workflow/${createWorkflow()}`)} className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg bg-teal-300 px-4 text-sm font-semibold text-[#062522] hover:bg-teal-200"><Plus className="size-4" /> New workflow</button><div className="mt-10 grid gap-3">{workflows.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">No retained workflows yet.</div> : workflows.map((workflow) => <Link key={workflow.id} href={`/workflow/${workflow.id}`} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-teal-300/35"><span className="grid size-10 place-items-center rounded-lg bg-teal-300/10 text-teal-200"><WorkflowIcon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm text-white/80">{workflow.name}</span><span className="mt-1 block text-xs text-white/30">{workflow.nodes.length} nodes</span></span><ArrowRight className="size-4 text-white/30" /></Link>)}</div></div></main>;
}
