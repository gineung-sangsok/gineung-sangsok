import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  message,
  action,
  onAction,
}: {
  icon: LucideIcon;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-brand-soft flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-brand" />
      </div>
      <p className="text-[13px] text-text-muted mb-4">{message}</p>
      {action && onAction && (
        <button onClick={onAction} className="btn btn-primary">
          {action}
        </button>
      )}
    </div>
  );
}
