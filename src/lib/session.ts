import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session-token";

/** Call from every data function, not only layouts: layouts don't re-run on client navigation. */
export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  if (!verifySessionToken(store.get(SESSION_COOKIE)?.value)) {
    redirect("/login");
  }
}
