"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkflowCanvas from "@/components/WorkflowCanvas";
import { useWorkflowStore } from "@/lib/store";
export default function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const select = useWorkflowStore((state) => state.selectWorkflow);
  const exists = useWorkflowStore((state) => state.workflows.some((workflow) => workflow.id === id));
  const [hydrated, setHydrated] = useState(() => useWorkflowStore.persist.hasHydrated());

  useEffect(() => {
    return useWorkflowStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!exists) router.replace("/workflow"); else select(id);
  }, [exists, hydrated, id, router, select]);

  if (!hydrated || !exists) return <div className="grid min-h-screen flex-1 place-items-center bg-[#0a0c12] text-sm text-white/35">Loading composer…</div>;
  return <WorkflowCanvas />;
}
