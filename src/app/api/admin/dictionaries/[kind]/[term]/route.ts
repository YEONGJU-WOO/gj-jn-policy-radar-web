import { adminProxy } from "@/app/api/admin/_proxy";

export async function PUT(
  request: Request,
  { params }: { params: { kind: string; term: string } },
) {
  return adminProxy(
    `/api/dictionaries/${encodeURIComponent(params.kind)}/${encodeURIComponent(params.term)}`,
    { method: "PUT", body: await request.text() },
  );
}
