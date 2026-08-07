import { Suspense } from "react";
import { WorkflowTable } from "@/components/WorkflowTable";
import { listWorkflowTracesPage } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function WorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const result = await listWorkflowTracesPage(page);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Workflow</h2>
        <p className="mt-1 text-sm text-slate-600">
          Per-request agent pipeline traces. Click a row for the n8n-style flow diagram.
          Traces auto-delete after 3 days.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-slate-500">Loading table…</p>}>
        <WorkflowTable result={result} />
      </Suspense>
    </div>
  );
}
