"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

type Toast = { id: number; kind: "ok" | "err"; text: string };
const Ctx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl border bg-white p-3 text-sm card-shadow ${
              t.kind === "ok" ? "border-success/30" : "border-red-300"
            }`}
          >
            {t.kind === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            )}
            <p className="flex-1">{t.text}</p>
            <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} aria-label="Kapat">
              <X className="h-4 w-4 text-muted" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
