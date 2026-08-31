"use client";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import WorkflowCanvas from "@/components/WorkflowCanvas";
import { useWorkflowStore } from "@/lib/store";
export default function WorkflowPage({ params }: { params: Promise<{ id: string }> }) { const { id } = use(params); const router = useRouter(); const select = useWorkflowStore((state) => state.selectWorkflow); const exists = useWorkflowStore((state) => state.workflows.some((workflow) => workflow.id === id)); useEffect(() => { if (!exists) router.replace("/workflow"); else select(id); }, [exists, id, router, select]); return <WorkflowCanvas />; }
