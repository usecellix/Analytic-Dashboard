"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  isAdminConfigured,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/session-token";

export type LoginState = { error: string | null };

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  // Only same-site paths: "//evil.com" and "/\evil.com" are protocol-relative redirects.
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) {
    return { error: "ADMIN_PASSWORD is not set on the server." };
  }
  const password = formData.get("password");
  if (typeof password !== "string" || !passwordMatches(password)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Incorrect password." };
  }

  const token = createSessionToken();
  if (!token) return { error: "Could not create a session." };
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
