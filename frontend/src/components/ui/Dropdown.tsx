import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && onOut();
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [ref, onOut, active]);
}

/** 작은 셀렉트 드롭다운 (레퍼런스의 "Aug ▾" 같은 필터 칩) */
export default function Dropdown<T extends string>({
  value,
  options,
  onChange,
  icon,
  align = "left",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  icon?: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);
  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`h-8 pl-3 pr-2 inline-flex items-center gap-1.5 rounded-[9px] border text-[12px] font-semibold transition-all ${
          open ? "border-brand bg-brand-soft text-action" : "border-border bg-surface text-text-secondary hover:border-border-strong"
        }`}
      >
        {icon}
        {current?.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`absolute z-30 mt-1.5 min-w-[150px] bg-surface border border-border rounded-xl p-1 animate-scale-in origin-top ${
            align === "right" ? "right-0" : "left-0"
          }`}
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-[12.5px] text-left transition-colors ${
                o.value === value ? "bg-brand-soft text-action font-semibold" : "hover:bg-surface-secondary text-text-primary"
              }`}
            >
              {o.label}
              {o.value === value && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
