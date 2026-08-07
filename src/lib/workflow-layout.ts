import type { WorkflowEdge, WorkflowNode } from "@/lib/types";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;
const H_GAP = 80;
const V_GAP = 36;

/** Left-to-right layered layout from edges (topological depth). */
export function layoutWorkflowGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const depth = new Map<string, number>();
  const incoming = new Map<string, string[]>();

  for (const id of ids) {
    depth.set(id, 0);
    incoming.set(id, []);
  }
  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) continue;
    incoming.get(edge.target)?.push(edge.source);
  }

  // Relax depths a few times (DAG is typically short).
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const id of ids) {
      const parents = incoming.get(id) ?? [];
      if (parents.length === 0) continue;
      const next = Math.max(...parents.map((p) => depth.get(p) ?? 0)) + 1;
      if (next > (depth.get(id) ?? 0)) {
        depth.set(id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Fallback: if no edges, use insertion order as depth.
  if (edges.length === 0) {
    ids.forEach((id, i) => depth.set(id, i));
  }

  const columns = new Map<number, string[]>();
  for (const id of ids) {
    const d = depth.get(id) ?? 0;
    const list = columns.get(d) ?? [];
    list.push(id);
    columns.set(d, list);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const sortedDepths = [...columns.keys()].sort((a, b) => a - b);
  for (const d of sortedDepths) {
    const col = columns.get(d) ?? [];
    col.forEach((id, row) => {
      positions.set(id, {
        x: d * (NODE_WIDTH + H_GAP),
        y: row * (NODE_HEIGHT + V_GAP),
      });
    });
  }

  return { positions, nodeWidth: NODE_WIDTH, nodeHeight: NODE_HEIGHT };
}
