import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/options";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = session?.user ? (session.user as { role?: string }).role : undefined;
  if (role !== "admin") {
    return NextResponse.json({ detail: "관리자 권한이 필요합니다." }, { status: 403 });
  }
  return null;
}

export async function adminProxy(path: string, init: RequestInit = {}) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Admin-Key": process.env.ADMIN_API_KEY ?? "",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}
