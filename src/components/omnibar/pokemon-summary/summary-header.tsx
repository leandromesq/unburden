import type { ReactNode } from "react";

interface SummaryHeaderProps {
  title: string;
  megaToggle?: ReactNode;
  removeAction?: ReactNode;
}

export function SummaryHeader({
  title,
  megaToggle,
  removeAction,
}: SummaryHeaderProps) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="theme-text-faint text-xs font-semibold uppercase tracking-[0.24em]">
          {title}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {megaToggle}
        {removeAction}
      </div>
    </div>
  );
}
