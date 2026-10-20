const VARIANTS: Record<string, string> = {
  closing: "bg-[#FBF1E4] text-status-warn",
  active: "bg-[#E4F3EC] text-status-ok",
  confirmed: "bg-[#E4F3EC] text-status-ok",
  review: "bg-[#FBF1E4] text-status-warn",
  error: "bg-[#FBE9E9] text-status-error",
  info: "bg-[#E7F0FA] text-status-info",
  muted: "bg-surface-secondary text-text-muted",
  brand: "bg-brand-soft text-action",
};

export type BadgeVariant = keyof typeof VARIANTS;

export default function StatusBadge({
  variant = "muted",
  dot = false,
  children,
}: {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[11px] font-semibold whitespace-nowrap ${VARIANTS[variant] ?? VARIANTS.muted}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const FACILITY_STATUS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  CLOSING: { variant: "closing", label: "폐업 예정" },
  ACTIVE: { variant: "active", label: "영업 중" },
  SEASONAL: { variant: "info", label: "계절 운영" },
  SUSPENDED: { variant: "muted", label: "일시 중단" },
  CLOSED: { variant: "error", label: "폐업 완료" },
};
