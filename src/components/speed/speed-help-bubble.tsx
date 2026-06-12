"use client";

import { CircleHelp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";

const SPEED_ROWS = [
  ["pokemon", "Basculegion"],
  ["x", "Basculegion x Aerodactyl"],
  ["spe-sp:N", "spe-sp:20"],
  ["+speed / -speed", "+speed"],
  ["spe+1 / spe-1", "spe-1"],
  ["tailwind / paralysis", "tailwind"],
  ["@item", "@choice-scarf"],
  ["~global", "~rain ~trick-room"],
] as const;

export function SpeedHelpBubble() {
  const { dictionary } = useI18n();
  const speed = dictionary.speedBenchmark;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = "speed-help-title";
  const descriptionId = "speed-help-description";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative z-[var(--z-popover)]">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="speed-help-dialog"
        aria-label={speed.helpTrigger}
        onClick={() => setOpen((value) => !value)}
        className={`theme-icon-button-sm text-sm font-semibold ${
          open ? "theme-icon-button-active" : "theme-icon-button"
        }`}
      >
        <CircleHelp aria-hidden="true" size={15} strokeWidth={1.9} />
      </button>

      {open ? (
        <div
          id="speed-help-dialog"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="theme-panel absolute right-0 top-full z-[var(--z-popover)] mt-2 w-[min(calc(100vw-2rem),22rem)] rounded-lg p-4 text-left outline-none"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 id={titleId} className="text-sm font-semibold">
                {speed.helpTitle}
              </h3>
              <p
                id={descriptionId}
                className="theme-text-muted mt-1 font-mono text-[12px] leading-5"
              >
                {speed.helpDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={speed.helpClose}
              className="theme-icon-button theme-icon-button-sm shrink-0 text-sm"
            >
              <X aria-hidden="true" size={15} strokeWidth={2.1} />
            </button>
          </div>

          <div className="grid gap-2">
            {SPEED_ROWS.map(([token, example]) => (
              <div
                key={token}
                className="theme-subpanel grid grid-cols-[7rem_minmax(0,1fr)] gap-2 rounded-md px-3 py-2"
              >
                <code className="font-mono text-[12px] text-[var(--text)]">
                  {token}
                </code>
                <span className="theme-text-faint truncate font-mono text-[12px]">
                  {example}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
