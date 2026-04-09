"use client";

interface GhostSuggestionProps {
  value: string;
  ghostText: string;
  scrollLeft: number;
  scrollTop: number;
}

export function GhostSuggestion({
  value,
  ghostText,
  scrollLeft,
  scrollTop,
}: GhostSuggestionProps) {
  if (!ghostText) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden px-5 py-4 text-left text-lg leading-8 text-zinc-500 md:text-xl"
    >
      <div
        className="whitespace-pre-wrap break-words text-left font-mono tracking-[-0.02em]"
        data-testid="ghost-suggestion"
        style={{ transform: `translate(${-scrollLeft}px, ${-scrollTop}px)` }}
      >
        <span className="invisible">{value}</span>
        <span>{ghostText}</span>
      </div>
    </div>
  );
}
