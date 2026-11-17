"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function postJson<T = unknown>(url: string, body: unknown): Promise<ActionResult<T>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? "İşlem başarısız oldu." };
    return { ok: true, data: json.data as T };
  } catch {
    return { ok: false, error: "Sunucuya ulaşılamadı." };
  }
}

/** Sunucu aksiyonu çağırır, toast gösterir, sayfa verisini yeniler. */
export function useAction() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T = unknown>(action: string, payload: unknown, success?: string): Promise<ActionResult<T>> => {
      setBusy(true);
      const r = await postJson<T>("/api/action", { action, payload });
      setBusy(false);
      if (r.ok) {
        if (success) toast("ok", success);
        router.refresh();
      } else toast("err", r.error ?? "Hata");
      return r;
    },
    [router, toast],
  );
  return { run, busy };
}
