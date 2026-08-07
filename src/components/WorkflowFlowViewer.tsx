"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/Badge";
import { JsonBlock } from "@/components/JsonBlock";
import { formatMs } from "@/lib/format";
import { layoutWorkflowGraph } from "@/lib/workflow-layout";
import type { WorkflowTraceView } from "@/lib/serialize";
import type { WorkflowNode, WorkflowNodeStatus, WorkflowNodeType } from "@/lib/types";

type FlowNodeData = {
  label: string;
  nodeType: WorkflowNodeType;
  status: WorkflowNodeStatus;
  durationMs?: number;
  workflowNode: WorkflowNode;
};

function typeColor(type: WorkflowNodeType): string {
  switch (type) {
    case "frontend_in":
    case "sse_out":
    case "preview":
      return "border-sky-400 bg-sky-50";
    case "router":
    case "tier":
      return "border-violet-400 bg-violet-50";
    case "planner":
      return "border-teal-500 bg-teal-50";
    case "executor":
      return "border-amber-400 bg-amber-50";
    case "verifier":
      return "border-indigo-400 bg-indigo-50";
    case "changeset":
      return "border-emerald-500 bg-emerald-50";
    case "accept":
      return "border-emerald-600 bg-emerald-100";
    case "reject":
    case "error":
      return "border-rose-500 bg-rose-50";
    case "tool":
      return "border-slate-400 bg-slate-50";
    default:
      return "border-slate-300 bg-white";
  }
}

function statusTone(
  status: WorkflowNodeStatus,
): "neutral" | "success" | "danger" | "warn" {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "running" || status === "pending") return "warn";
  return "neutral";
}

function WorkflowFlowNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  return (
    <div
      className={`min-w-[180px] rounded-lg border-2 px-3 py-2 shadow-sm ${typeColor(
        nodeData.nodeType,
      )} ${selected ? "ring-2 ring-teal-600 ring-offset-1" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {nodeData.nodeType.replace(/_/g, " ")}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{nodeData.label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <Badge tone={statusTone(nodeData.status)}>{nodeData.status}</Badge>
        {nodeData.durationMs != null ? (
          <span className="text-[10px] text-slate-500">
            {formatMs(nodeData.durationMs)}
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  );
}

const nodeTypes = { workflow: WorkflowFlowNode };

function WorkflowFlowCanvas({ trace }: { trace: WorkflowTraceView }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { flowNodes, flowEdges } = useMemo(() => {
    const { positions } = layoutWorkflowGraph(trace.nodes, trace.edges);
    const nextNodes: Node[] = trace.nodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 };
      return {
        id: n.id,
        type: "workflow",
        position: pos,
        data: {
          label: n.label,
          nodeType: n.type,
          status: n.status,
          durationMs: n.durationMs,
          workflowNode: n,
        } satisfies FlowNodeData,
      };
    });
    const nextEdges: Edge[] = trace.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: { stroke: "#94a3b8" },
    }));
    return { flowNodes: nextNodes, flowEdges: nextEdges };
  }, [trace.nodes, trace.edges]);

  const selected = useMemo(
    () => trace.nodes.find((n) => n.id === selectedId) ?? null,
    [trace.nodes, selectedId],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedId(node.id);
  }, []);

  return (
    <div className="flex min-h-[640px] flex-col gap-4 lg:flex-row">
      <div className="h-[480px] min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 lg:h-auto lg:min-h-[640px]">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedId(null)}
          fitView
          minZoom={0.3}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} />
          <MiniMap nodeStrokeWidth={2} pannable zoomable className="!bg-white" />
        </ReactFlow>
      </div>

      <aside className="w-full shrink-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:w-[380px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Node inspector
          </p>
          {selected ? (
            <>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {selected.label}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{selected.type}</Badge>
                <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
                {selected.durationMs != null ? (
                  <Badge tone="neutral">{formatMs(selected.durationMs)}</Badge>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Click a node to inspect its input and output (n8n-style).
            </p>
          )}
        </div>

        {selected ? (
          <>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Input
              </p>
              <JsonBlock value={selected.input ?? null} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Output
              </p>
              <JsonBlock value={selected.output ?? null} />
            </div>
            {selected.meta ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Meta
                </p>
                <JsonBlock value={selected.meta} />
              </div>
            ) : null}
          </>
        ) : null}
      </aside>
    </div>
  );
}

export function WorkflowFlowViewer({ trace }: { trace: WorkflowTraceView }) {
  return (
    <ReactFlowProvider>
      <WorkflowFlowCanvas trace={trace} />
    </ReactFlowProvider>
  );
}
