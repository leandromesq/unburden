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
    <div className="flex items-start justify-between gap-3">
      <div className="theme-text-faint text-xs font-semibold uppercase tracking-[0.24em]">
        {title}
      </div>
      <div className="flex items-center gap-1">
        {megaToggle}
        {removeAction}
      </div>
    </div>
  );
}
