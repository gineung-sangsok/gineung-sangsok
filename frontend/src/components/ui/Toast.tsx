import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

type Kind = "ok" | "info" | "warn";
interface ToastItem { id: number; kind: Kind; title: string; desc?: string; leaving?: boolean }

const Ctx = createContext<(t: { kind?: Kind; title: string; desc?: string }) => void>(() => {});

const ICON = { ok: CheckCircle2, info: Info, warn: AlertTriangle };
const TONE = { ok: "text-status-ok", info: "text-status-info", warn: "text-status-warn" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((p) => p.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 220);
  }, []);

  const push = useCallback(
    ({ kind = "ok", title, desc }: { kind?: Kind; title: string; desc?: string }) => {
      const id = Date.now() + Math.random();
      setItems((p) => [...p.slice(-3), { id, kind, title, desc }]);
      setTimeout(() => dismiss(id), 3600);
    },
    [dismiss],
  );

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {items.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-[340px] bg-[#0C3341] text-white rounded-2xl px-4 py-3.5 flex gap-3 items-start transition-all duration-200 ${
                t.leaving ? "opacity-0 translate-x-6" : "animate-slide-in-right"
              }`}
              style={{ boxShadow: "var(--shadow-pop)" }}
            >
              <Icon className={`w-[18px] h-[18px] mt-0.5 shrink-0 ${TONE[t.kind]} brightness-150`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">{t.title}</p>
                {t.desc && <p className="text-[12px] text-white/60 mt-0.5">{t.desc}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
