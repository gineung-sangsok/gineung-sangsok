import type { ReactNode } from "react";

export default function PageHeader({
  title,
  en,
  desc,
  badge,
  actions,
  eyebrow,
}: {
  title: string;
  /** 영어 소제목. 한글 제목 위에 작은 대문자로 쓴다 */
  en?: string;
  desc?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-7 animate-fade-up">
      <div className="min-w-0">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        {en && <p className="eyebrow">{en}</p>}
        <div className={`flex items-center gap-3 ${en ? "mt-2" : ""}`}>
          <h1 className="title-sticker text-[44px] leading-[1.1] -rotate-1 origin-left">{title}</h1>
          {badge}
        </div>
        {desc && <p className="text-[15px] text-text-secondary mt-3">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function DemoTag() {
  return (
    <span
      title="API 연결 전 UI 시연용 샘플 데이터입니다"
      className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[11px] font-bold tracking-wide bg-[#FFF3C4] text-ink border-2 border-ink rotate-2"
    >
      데모 데이터
    </span>
  );
}

export function CardHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="font-title text-[21px] text-text-primary tracking-[0.01em]">{title}</h2>
        {sub && <p className="text-[12.5px] text-text-muted mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
