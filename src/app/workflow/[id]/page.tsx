import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { WorkflowFlowViewer } from "@/components/WorkflowFlowViewer";
import { formatMs, formatTs } from "@/lib/format";
import { getWorkflowTraceView } from "@/lib/queries";
import type { WorkflowTraceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusTone(
  status: WorkflowTraceStatus,
): "neutral" | "success" | "danger" | "warn" {
  switch (status) {
    case "accepted":
    case "completed":
      return "success";
    case "failed":
    case "rejected":
      return "danger";
    case "awaiting_accept":
    case "clarifying":
    case "running":
      return "warn";
    default:
      return "neutral";
  }
}

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trace = await getWorkflowTraceView(id);
  if (!trace) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/workflow"
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            ← All workflows
          </Link>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Workflow trace
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-700">{trace.message}</p>
        </div>
        <Badge tone={statusTone(trace.status)}>{trace.status}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaBox label="Time" value={formatTs(trace.ts)} />
        <MetaBox label="Duration" value={formatMs(trace.durationMs)} />
        <MetaBox
          label="Route / Tier"
          value={`${trace.route ?? "—"}${trace.tier != null ? ` · T${trace.tier}` : ""}`}
        />
        <MetaBox label="Mode" value={trace.mode ?? "—"} />
        <MetaBox label="Trace ID" value={trace.traceId} mono />
        <MetaBox label="Conversation" value={trace.conversationId ?? "—"} mono />
        <MetaBox label="Change set" value={trace.changeSetId ?? "—"} mono />
        <MetaBox label="Nodes" value={String(trace.nodeCount)} />
      </div>

      <WorkflowFlowViewer trace={trace} />
    </div>
  );
}

function MetaBox({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-sm text-slate-900 ${mono ? "font-mono text-xs" : ""}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
