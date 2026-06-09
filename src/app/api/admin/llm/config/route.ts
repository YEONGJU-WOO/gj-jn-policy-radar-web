import { adminProxy } from "@/app/api/admin/_proxy";

export async function GET() {
  return adminProxy("/api/llm/config", { method: "GET" });
}

export async function PUT(request: Request) {
  return adminProxy("/api/llm/config", { method: "PUT", body: await request.text() });
}
