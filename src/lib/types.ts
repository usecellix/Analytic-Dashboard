import { ObjectId } from "mongodb";

export interface RequestLogDoc {
  _id: ObjectId;
  ts: Date;
  method: string;
  url: string;
  statusCode: number;
  responseTimeMs: number;
  reqId?: string;
  traceId?: string;
  message?: string;
  response?: unknown;
}

export interface PlannerSubtask {
  id?: string;
  description?: string;
  targetSheet?: string;
  dependsOn?: string[];
  estimatedActions?: number;
}

export interface PlannerParsed {
  subtasks?: PlannerSubtask[];
  clarificationsNeeded?: string[];
  confidence?: string;
  reasoning?: string;
}

export interface PlannerLogDoc {
  _id: ObjectId;
  ts: Date;
  correlationId: string;
  model: string;
  durationMs: number;
  success: boolean;
  error?: string;
  input: {
    prompt?: string;
    userMessage?: string;
    routerAssumption?: string;
    historyLength?: number;
    sheets?: string[];
    activeSheet?: string;
    hasPromptContext?: boolean;
    systemPrompt?: string;
    [key: string]: unknown;
  };
  output: {
    raw?: string;
    parsed?: PlannerParsed;
    fallback?: boolean;
    retried?: boolean;
    [key: string]: unknown;
  };
}

export interface OverviewStats {
  requestCount: number;
  plannerCount: number;
  frontendCount: number;
  frontendErrorCount: number;
  plannerSuccessRate: number;
  avgPlannerLatencyMs: number;
  recentRequests: RequestLogDoc[];
  recentPlanner: PlannerLogDoc[];
  recentFrontend: FrontendLogDoc[];
}

export type FrontendLogLevel = 'error' | 'warn' | 'info' | 'action';
export type FrontendLogCategory =
  | 'console'
  | 'preview'
  | 'accept'
  | 'reject'
  | 'apply'
  | 'sse'
  | 'navigation'
  | 'other';

export interface FrontendLogDoc {
  _id: ObjectId;
  ts: Date;
  level: FrontendLogLevel;
  category: FrontendLogCategory;
  event: string;
  message: string;
  conversationId?: string;
  changeSetId?: string;
  sessionId?: string;
  workbookKey?: string;
  userAgent?: string;
  pageUrl?: string;
  details?: unknown;
}

export type WorkflowTraceStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'clarifying'
  | 'awaiting_accept'
  | 'accepted'
  | 'rejected';

export type WorkflowNodeType =
  | 'frontend_in'
  | 'router'
  | 'tier'
  | 'planner'
  | 'executor'
  | 'verifier'
  | 'tool'
  | 'changeset'
  | 'sse_out'
  | 'preview'
  | 'accept'
  | 'reject'
  | 'error';

export type WorkflowNodeStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  status: WorkflowNodeStatus;
  startedAt?: Date | string;
  endedAt?: Date | string;
  durationMs?: number;
  input?: unknown;
  output?: unknown;
  meta?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowTraceDoc {
  _id: ObjectId;
  ts: Date;
  traceId: string;
  conversationId?: string;
  changeSetId?: string;
  message: string;
  mode?: string;
  route?: string;
  tier?: number;
  status: WorkflowTraceStatus;
  durationMs?: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  lastNodeId?: string;
}
