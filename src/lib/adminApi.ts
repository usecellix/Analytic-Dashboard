import { requireAdmin } from "./session";

/**
 * Every `data/*.ts` function's transport to `cellix_backend`'s `/admin/*`
 * routes (AdminGuard) instead of a direct MongoClient — see TASKS.md
 * admin-api-migration. Server-only: gates on the Dashboard's own admin
 * session first (same rule `adminDb()` enforced), so a page component can
 * never reach the backend token without going through requireAdmin().
 *
 * `CELLIX_ADMIN_API_TOKEN` must match `cellix_backend`'s own
 * `CELLIX_ADMIN_API_TOKEN` — the same shared secret, not something either
 * side generates independently.
 */
async function adminApiToken(): Promise<string> {
  const token = process.env.CELLIX_ADMIN_API_TOKEN;
  if (!token) throw new Error("CELLIX_ADMIN_API_TOKEN is not configured");
  return token;
}

function apiBaseUrl(): string {
  const url = process.env.CELLIX_API_URL;
  if (!url) throw new Error("CELLIX_API_URL is not configured");
  return url.replace(/\/$/, "");
}

/**
 * GETs `path` (e.g. "/admin/users") against the backend with the query
 * params in `params` (undefined/null/empty-string values are dropped, so
 * callers can pass every optional filter unconditionally). Throws with the
 * response body on a non-2xx status — callers don't get a partial page from
 * a malformed admin query silently returning nothing.
 */
export async function adminApiGet<T>(path: string, params: Record<string, string | number | undefined | null> = {}): Promise<T> {
  await requireAdmin();
  const token = await adminApiToken();

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  const url = `${apiBaseUrl()}${path}${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    headers: { "x-cellix-admin-token": token },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Admin API ${response.status} for ${path}: ${body || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

/** Same as adminApiGet, but returns `null` on a 404 instead of throwing — for "does this row exist" detail pages. */
export async function adminApiGetOrNull<T>(path: string, params: Record<string, string | number | undefined | null> = {}): Promise<T | null> {
  await requireAdmin();
  const token = await adminApiToken();

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  const url = `${apiBaseUrl()}${path}${query ? `?${query}` : ""}`;

  const response = await fetch(url, { headers: { "x-cellix-admin-token": token }, cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Admin API ${response.status} for ${path}: ${body || response.statusText}`);
  }
  return response.json() as Promise<T>;
}
