import type { FrontendLogDoc, PlannerLogDoc, RequestLogDoc, WorkflowTraceDoc } from "./types";

export type RequestLogView = Omit<RequestLogDoc, "_id" | "ts"> & {
  _id: string;
  ts: string;
};

export type PlannerLogView = Omit<PlannerLogDoc, "_id" | "ts"> & {
  _id: string;
  ts: string;
};

export type FrontendLogView = Omit<FrontendLogDoc, "_id" | "ts"> & {
  _id: string;
  ts: string;
};

export type WorkflowTraceView = Omit<WorkflowTraceDoc, "_id" | "ts" | "nodes"> & {
  _id: string;
  ts: string;
  nodes: WorkflowTraceDoc["nodes"];
  nodeCount: number;
};

export function serializeRequestLog(doc: RequestLogDoc): RequestLogView {
  return {
    ...doc,
    _id: String(doc._id),
    ts: new Date(doc.ts).toISOString(),
  };
}

export function serializePlannerLog(doc: PlannerLogDoc): PlannerLogView {
  return {
    ...doc,
    _id: String(doc._id),
    ts: new Date(doc.ts).toISOString(),
  };
}

export function serializeFrontendLog(doc: FrontendLogDoc): FrontendLogView {
  return {
    ...doc,
    _id: String(doc._id),
    ts: new Date(doc.ts).toISOString(),
  };
}

export function serializeWorkflowTrace(doc: WorkflowTraceDoc): WorkflowTraceView {
  const nodes = Array.isArray(doc.nodes) ? doc.nodes : [];
  return {
    ...doc,
    _id: String(doc._id),
    ts: new Date(doc.ts).toISOString(),
    nodes,
    edges: Array.isArray(doc.edges) ? doc.edges : [],
    nodeCount: nodes.length,
  };
}
