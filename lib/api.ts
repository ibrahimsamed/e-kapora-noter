import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./services";

export function ok(data: unknown = null) {
  return NextResponse.json({ data });
}

/** Hata → HTTP yanıtı. İç hata ayrıntıları ve hassas veriler istemciye/loga sızdırılmaz. */
export function handleError(e: unknown) {
  if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  console.error("[api] beklenmeyen hata:", e instanceof Error ? e.name : "unknown");
  return NextResponse.json({ error: "Beklenmeyen bir hata oluştu." }, { status: 500 });
}
