import ky, { isHTTPError, type HTTPError } from "ky";

import type { ApiEnvelope, ApiErrorPayload } from "@/types/api";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const statusMessages: Record<number, string> = {
  400: "요청 형식이 올바르지 않습니다.",
  401: "로그인이 필요합니다.",
  403: "관리자 권한이 필요합니다.",
  404: "요청한 데이터를 찾을 수 없습니다.",
  409: "이미 처리된 요청입니다.",
  422: "입력값을 확인해주세요.",
  500: "서버 처리 중 오류가 발생했습니다.",
  503: "서비스가 일시적으로 사용할 수 없습니다.",
};

export class ApiError extends Error {
  status: number;
  code: string;
  detail?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = payload.status;
    this.code = payload.code;
    this.detail = payload.detail;
  }
}

export const apiClient = ky.create({
  prefix: API_BASE_URL,
  timeout: 20_000,
  retry: {
    limit: 1,
    methods: ["get"],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      ({ request }) => {
        request.headers.set("Accept", "application/json");
      },
    ],
    beforeError: [
      async ({ error }) => {
        if (isHTTPError(error)) {
          return normalizeKyError(error);
        }
        return error;
      },
    ],
  },
});

export async function apiGet<T>(
  path: string,
  searchParams?: Record<string, string | number | boolean | null | undefined>,
): Promise<ApiEnvelope<T>> {
  const response = await apiClient
    .get(stripLeadingSlash(path), { searchParams: cleanParams(searchParams) })
    .json<ApiEnvelope<T>>();
  return normalizeEnvelope(response);
}

export async function apiPost<T>(path: string, json?: unknown): Promise<ApiEnvelope<T>> {
  const response = await apiClient.post(stripLeadingSlash(path), { json }).json<ApiEnvelope<T>>();
  return normalizeEnvelope(response);
}

export async function apiPut<T>(path: string, json?: unknown): Promise<ApiEnvelope<T>> {
  const response = await apiClient.put(stripLeadingSlash(path), { json }).json<ApiEnvelope<T>>();
  return normalizeEnvelope(response);
}

export async function adminPost<T>(path: string, json?: unknown): Promise<ApiEnvelope<T>> {
  return adminRequest<T>("post", path, json);
}

export async function adminPut<T>(path: string, json?: unknown): Promise<ApiEnvelope<T>> {
  return adminRequest<T>("put", path, json);
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    return new ApiError({ status: 0, code: "CLIENT_ERROR", message: error.message });
  }
  return new ApiError({
    status: 0,
    code: "UNKNOWN_ERROR",
    message: "알 수 없는 오류가 발생했습니다.",
  });
}

export function cleanParams(
  params?: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> | undefined {
  if (!params) return undefined;
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)]);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function stripLeadingSlash(path: string) {
  return path.replace(/^\/+/, "");
}

async function adminRequest<T>(
  method: "post" | "put",
  path: string,
  json?: unknown,
): Promise<ApiEnvelope<T>> {
  if (typeof window !== "undefined") {
    throw new ApiError({
      status: 403,
      code: "SERVER_ONLY",
      message: "관리자 API 호출은 서버에서만 사용할 수 있습니다.",
    });
  }
  const response = await apiClient(stripLeadingSlash(path), {
    method,
    json,
    headers: { "X-Admin-Key": process.env.ADMIN_API_KEY ?? "" },
  }).json<ApiEnvelope<T>>();
  return normalizeEnvelope(response);
}

async function normalizeKyError(error: HTTPError): Promise<ApiError> {
  const status = error.response.status;
  let detail: unknown;
  try {
    detail = await error.response.json();
  } catch {
    detail = await error.response.text().catch(() => undefined);
  }

  const backendMessage =
    typeof detail === "object" && detail !== null && "detail" in detail
      ? String((detail as { detail?: unknown }).detail)
      : undefined;

  return new ApiError({
    status,
    code: `HTTP_${status}`,
    message: fixMojibake(
      backendMessage || statusMessages[status] || "요청 처리 중 오류가 발생했습니다.",
    ),
    detail: normalizeTextDeep(detail),
  });
}

function normalizeEnvelope<T>(response: ApiEnvelope<T>): ApiEnvelope<T> {
  return normalizeTextDeep(response) as ApiEnvelope<T>;
}

function normalizeTextDeep(value: unknown): unknown {
  if (typeof value === "string") return fixMojibake(value);
  if (Array.isArray(value)) return value.map(normalizeTextDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeTextDeep(entry)]),
    );
  }
  return value;
}

export function fixMojibake(value: string) {
  if (!/[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const decodedHangul = (decoded.match(/[가-힣]/g) ?? []).length;
    const originalHangul = (value.match(/[가-힣]/g) ?? []).length;
    return decodedHangul > originalHangul ? decoded : value;
  } catch {
    return value;
  }
}
