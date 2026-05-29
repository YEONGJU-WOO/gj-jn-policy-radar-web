import { adminProxy } from "@/app/api/admin/_proxy";

export async function POST() {
  return adminProxy("/api/jobs/run-daily", { method: "POST" });
}
