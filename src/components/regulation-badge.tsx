import { activeRegulation } from "@/lib/data/regulations";

export function RegulationBadge() {
  return (
    <div
      className="theme-pill-muted inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-0 text-[11px] leading-none sm:px-2.5 sm:text-xs"
      title={`${activeRegulation.name} · ${activeRegulation.dateRange}`}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: "var(--accent)" }}
        aria-hidden="true"
      />
      <span style={{ color: "var(--text-dim)" }}>{activeRegulation.name}</span>
      <span
        className="mx-0.5 hidden sm:inline"
        style={{ color: "var(--text-faint)" }}
        aria-hidden="true"
      >
        ·
      </span>
      <span className="hidden sm:inline" style={{ color: "var(--text-faint)" }}>
        {activeRegulation.dateRange}
      </span>
    </div>
  );
}
