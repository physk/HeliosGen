import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WorkflowNode = { id: string; type: "prompt" | "reference" | "image"; title: string; value: string; imageUrl?: string };
export type Workflow = { id: string; name: string; nodes: WorkflowNode[]; createdAt: number; updatedAt: number };

type WorkflowState = {
  workflows: Workflow[];
  activeWorkflowId: string | null;
  createWorkflow: (name?: string) => string;
  selectWorkflow: (id: string) => void;
  renameWorkflow: (id: string, name: string) => void;
  deleteWorkflow: (id: string) => void;
  addNode: (type: WorkflowNode["type"]) => void;
  updateNode: (id: string, value: string, imageUrl?: string) => void;
};

const id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const initial = (): Workflow => ({ id: id(), name: "Untitled workflow", nodes: [{ id: id(), type: "prompt", title: "Prompt", value: "" }, { id: id(), type: "image", title: "Codex image", value: "" }], createdAt: Date.now(), updatedAt: Date.now() });

export const useWorkflowStore = create<WorkflowState>()(persist((set) => ({
  workflows: [], activeWorkflowId: null,
  createWorkflow: (name = "Untitled workflow") => { const workflow = { ...initial(), name }; set((state) => ({ workflows: [...state.workflows, workflow], activeWorkflowId: workflow.id })); return workflow.id; },
  selectWorkflow: (id) => set({ activeWorkflowId: id }),
  renameWorkflow: (id, name) => set((state) => ({ workflows: state.workflows.map((workflow) => workflow.id === id ? { ...workflow, name, updatedAt: Date.now() } : workflow) })),
  deleteWorkflow: (id) => set((state) => { const workflows = state.workflows.filter((workflow) => workflow.id !== id); return { workflows, activeWorkflowId: state.activeWorkflowId === id ? (workflows[0]?.id || null) : state.activeWorkflowId }; }),
  addNode: (type) => set((state) => { const workflow = state.workflows.find((item) => item.id === state.activeWorkflowId); if (!workflow) return state; const titles = { prompt: "Prompt", reference: "Reference image", image: "Codex image" }; const node = { id: id(), type, title: titles[type], value: "" }; return { workflows: state.workflows.map((item) => item.id === workflow.id ? { ...item, nodes: [...item.nodes, node], updatedAt: Date.now() } : item) }; }),
  updateNode: (nodeId, value, imageUrl) => set((state) => ({ workflows: state.workflows.map((workflow) => workflow.id !== state.activeWorkflowId ? workflow : { ...workflow, updatedAt: Date.now(), nodes: workflow.nodes.map((node) => node.id === nodeId ? { ...node, value, imageUrl } : node) }) })),
}), { name: "heliosgen-workflows" }));

export function getActiveWorkflow(state: WorkflowState): Workflow | undefined { return state.workflows.find((workflow) => workflow.id === state.activeWorkflowId); }
