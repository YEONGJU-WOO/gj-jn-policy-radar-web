import { adminProxy } from "@/app/api/admin/_proxy";

export async function POST(request: Request) {
  return adminProxy("/api/alerts", { method: "POST", body: await request.text() });
}
