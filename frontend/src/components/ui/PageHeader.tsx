import type { ReactNode } from "react";

export default function PageHeader({
  title,
  desc,
  badge,
  actions,
  eyebrow,
}: {
  title: string;
  desc?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-7 animate-fade-up">
      <div className="min-w-0">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-bold tracking-tight text-text-primary">{title}</h1>
          {badge}
        </div>
        {desc && <p className="text-[13.5px] text-text-secondary mt-1.5">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function DemoTag() {
  return (
    <span
      title="API 연결 전 UI 시연용 샘플 데이터입니다"
      className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[10.5px] font-bold tracking-wide bg-[#FFF5DB] text-[#9A6B00] border border-[#F3E2B0]"
    >
      데모 데이터
    </span>
  );
}

export function CardHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-[16px] font-bold text-action">{title}</h2>
        {sub && <p className="text-[12px] text-text-muted mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
