import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** 슬라이딩 인디케이터가 있는 세그먼트 컨트롤 / 탭 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  variant = "pill",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  variant?: "pill" | "underline";
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLButtonElement>(`[data-v="${CSS.escape(value)}"]`);
    if (!el) return;
    const measure = () => setInd({ left: el.offsetLeft, width: el.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, options]);

  const h = size === "sm" ? "h-8 text-[12px] px-3" : "h-9 text-[13px] px-4";

  if (variant === "underline") {
    return (
      <div ref={wrap} className="relative flex gap-1 border-b border-border">
        {options.map((o) => (
          <button
            key={o.value}
            data-v={o.value}
            onClick={() => onChange(o.value)}
            className={`relative ${h} font-semibold transition-colors ${
              value === o.value ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {o.label}
          </button>
        ))}
        <span
          className="absolute -bottom-px h-[2px] bg-action rounded-full transition-all duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
          style={{ left: ind.left, width: ind.width }}
        />
      </div>
    );
  }

  return (
    <div ref={wrap} className="relative inline-flex p-1 bg-surface-secondary rounded-xl">
      <span
        className="absolute top-1 bottom-1 bg-surface rounded-[9px] transition-all duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
        style={{ left: ind.left, width: ind.width, boxShadow: "0 1px 3px rgba(16,42,56,.12)" }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          data-v={o.value}
          onClick={() => onChange(o.value)}
          className={`relative z-[1] ${h} rounded-[9px] font-semibold transition-colors whitespace-nowrap ${
            value === o.value ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
