import { NextResponse } from "next/server";

export type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  meta?: ApiMeta;
  warning?: string;
};

export function ok<T>(message: string, data?: T, meta?: ApiMeta, warning?: string, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, message, data, meta, warning }, { status });
}

export function fail(message: string, status = 400, data?: unknown) {
  return NextResponse.json<ApiResponse>({ success: false, message, data }, { status });
}
