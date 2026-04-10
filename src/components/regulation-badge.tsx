import { activeRegulation } from "@/lib/data/loaders";

export function RegulationBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-(--line-strong) bg-transparent px-3 py-1 text-xs">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: "var(--accent)" }}
        aria-hidden="true"
      />
      <span style={{ color: "var(--text-dim)" }}>{activeRegulation.name}</span>
      <span
        className="mx-0.5"
        style={{ color: "var(--text-faint)" }}
        aria-hidden="true"
      >
        ·
      </span>
      <span style={{ color: "var(--text-faint)" }}>
        {activeRegulation.dateRange}
      </span>
    </div>
  );
}
