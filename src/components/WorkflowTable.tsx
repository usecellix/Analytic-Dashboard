"use client";

import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Pagination } from "@/components/Pagination";
import { formatMs, formatTs } from "@/lib/format";
import type { PageResult } from "@/lib/queries";
import type { WorkflowTraceView } from "@/lib/serialize";
import type { WorkflowTraceStatus } from "@/lib/types";

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

export function WorkflowTable({ result }: { result: PageResult<WorkflowTraceView> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Prompt</th>
              <th className="px-4 py-3 font-medium">Mode</th>
              <th className="px-4 py-3 font-medium">Route / Tier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Nodes</th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No workflow traces yet. Send a conversation request to populate this
                  view.
                </td>
              </tr>
            ) : (
              result.items.map((row) => (
                <tr
                  key={row._id}
                  className="border-b border-slate-100 last:border-0 hover:bg-teal-50/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                    <Link
                      href={`/workflow/${row._id}`}
                      className="text-teal-700 hover:underline"
                    >
                      {formatTs(row.ts)}
                    </Link>
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <Link
                      href={`/workflow/${row._id}`}
                      className="line-clamp-2 text-slate-900 hover:text-teal-800"
                    >
                      {row.message || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{row.mode ?? "—"}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {row.route ?? "—"}
                    {row.tier != null ? ` · T${row.tier}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatMs(row.durationMs)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{row.nodeCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        basePath="/workflow"
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
      />
    </div>
  );
}
