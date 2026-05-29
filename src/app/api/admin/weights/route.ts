import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_proxy";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const payload = await request.json();
  return NextResponse.json({
    served_at_kst: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }),
    data: { saved: true, weights: payload },
  });
}
