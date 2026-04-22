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
      <div className="theme-text-faint min-w-0 break-words text-xs font-semibold uppercase tracking-[0.24em]">
        {title}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {megaToggle}
        {removeAction}
      </div>
    </div>
  );
}
