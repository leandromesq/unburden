"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { CircleHelp, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className="inline-flex items-center justify-center rounded-md font-mono text-[11px]"
      style={{
        minWidth: "1.6rem",
        padding: "2px 6px",
        background: "var(--surface-4)",
        border: "1px solid var(--line-strong)",
        borderBottomWidth: "2px",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </kbd>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="theme-section-title mb-2">{children}</div>;
}

function Divider() {
  return <div className="theme-divider my-3 border-t" />;
}

export function HelpBubble() {
  const { dictionary } = useI18n();
  const [open, setOpen] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const hasOpenedRef = useRef(false);
  const titleId = "help-bubble-title";
  const descriptionId = "help-bubble-description";
  const handlePointerDown = useEffectEvent((event: PointerEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      startTransition(() => {
        setOpen(false);
      });
    }
  });
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      startTransition(() => {
        setOpen(false);
      });
    }
  });
  const updateScrollIndicators = () => {
    const dialog = dialogRef.current;

    if (!dialog) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }

    const { scrollTop, clientHeight, scrollHeight } = dialog;
    const maxScrollTop = scrollHeight - clientHeight;
    const threshold = 6;

    setCanScrollUp(scrollTop > threshold);
    setCanScrollDown(maxScrollTop - scrollTop > threshold);
  };

  useEffect(() => {
    if (!open) return;

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
        updateScrollIndicators();
      });
      return;
    }

    if (!hasOpenedRef.current) {
      return;
    }

    buttonRef.current?.focus();
    hasOpenedRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    window.addEventListener("resize", updateScrollIndicators);
    return () => window.removeEventListener("resize", updateScrollIndicators);
  }, [open]);

  return (
    <div ref={containerRef} className="relative z-30">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="help-bubble-dialog"
        aria-label={dictionary.helpBubble.triggerAria}
        onClick={() => {
          startTransition(() => {
            setOpen((prev) => !prev);
          });
        }}
        className={`theme-icon-button-sm text-sm font-semibold ${
          open ? "theme-icon-button-active" : "theme-icon-button"
        }`}
      >
        <CircleHelp aria-hidden="true" size={15} strokeWidth={1.9} />
      </button>

      {open && (
        <div
          id="help-bubble-dialog"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className="theme-panel absolute right-0 top-full z-50 mt-2 w-[24rem] overflow-hidden rounded-xl text-left outline-none"
          style={{ boxShadow: "var(--shadow-overlay)" }}
        >
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-6 transition-opacity ${
              canScrollUp ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--surface-2) 98%, transparent) 0%, transparent 100%)",
            }}
          />
          <div
            ref={dialogRef}
            className="scrollbar-none max-h-[80vh] overflow-y-auto p-4"
            onScroll={updateScrollIndicators}
          >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-sm font-semibold">
                {dictionary.helpBubble.title}
              </h2>
              <p
                id={descriptionId}
                className="theme-text-muted mt-1 text-[13px] leading-5"
              >
                {dictionary.helpBubble.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  setOpen(false);
                });
              }}
              aria-label={dictionary.helpBubble.closeAria}
              className="theme-icon-button theme-icon-button-sm shrink-0 text-sm"
            >
              <X aria-hidden="true" size={15} strokeWidth={2.1} />
            </button>
          </div>
          <section>
            <SectionHeading>{dictionary.helpBubble.structure}</SectionHeading>
            <div className="theme-subpanel-strong rounded-lg px-3 py-3">
              <div
                className="font-mono text-sm"
                style={{ color: "var(--text)" }}
              >
                attacker !move [attacker tokens] x defender [defender tokens]
                [global tokens]
              </div>
              <div className="theme-text-muted mt-2 text-[12px]">
                {dictionary.helpBubble.structureDescription}
              </div>
            </div>
          </section>

          <Divider />

          <section>
            <SectionHeading>{dictionary.helpBubble.coreTokens}</SectionHeading>
            <div className="grid gap-2 sm:grid-cols-2">
              {dictionary.helpBubble.syntaxRows.map(
                ({ token, description, example }) => (
                <div
                  key={token}
                  className="theme-subpanel rounded-lg px-3 py-2.5"
                >
                    <code className="theme-badge mb-1 inline-block rounded px-1.5 py-0.5 font-mono text-[11px]">
                      {token}
                    </code>
                    <div className="theme-text-muted text-[12px] leading-snug">
                      {description}
                    </div>
                    <div
                      className="mt-2 font-mono text-[11px]"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {example}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <Divider />

          <section>
            <SectionHeading>{dictionary.helpBubble.segmentTokens}</SectionHeading>
            <div className="space-y-3">
              <div className="theme-subpanel rounded-lg p-3">
                <div className="theme-text-muted mb-2 text-sm font-medium">
                  {dictionary.helpBubble.attacker}
                </div>
                <div className="space-y-1">
                  {dictionary.helpBubble.attackerModifiers.map(
                    ({ token, label }) => (
                      <div key={token} className="flex items-baseline gap-2">
                        <code className="theme-pill-muted shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
                          {token}
                        </code>
                        <span className="theme-text-dim text-[12px]">
                          {label}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="theme-subpanel rounded-lg p-3">
                <div className="theme-text-muted mb-2 text-sm font-medium">
                  {dictionary.helpBubble.defender}
                </div>
                <div className="space-y-1">
                  {dictionary.helpBubble.defenderModifiers.map(
                    ({ token, label }) => (
                      <div key={token} className="flex items-baseline gap-2">
                        <code className="theme-pill-muted shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
                          {token}
                        </code>
                        <span className="theme-text-dim text-[12px]">
                          {label}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </section>

          <Divider />

          <section>
            <SectionHeading>{dictionary.helpBubble.hotkeys}</SectionHeading>
            <div className="grid gap-2 sm:grid-cols-2">
              {dictionary.helpBubble.hotkeyRows.map(({ keys, description }) => (
                <div key={description} className="theme-subpanel rounded-lg px-3 py-2.5">
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </div>
                  <span className="theme-text-muted mt-2 block text-[12px]">
                    {description}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <Divider />
          <section>
            <SectionHeading>{dictionary.helpBubble.tips}</SectionHeading>
            <ul className="space-y-1.5">
              {dictionary.helpBubble.tipsList.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--text-faint)" }}
                    aria-hidden
                  />
                  <span className="theme-text-dim text-[13px]">{tip}</span>
                </li>
              ))}
            </ul>
          </section>
          </div>

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 transition-opacity ${
              canScrollDown ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background:
                "linear-gradient(0deg, color-mix(in srgb, var(--surface-2) 98%, transparent) 0%, transparent 100%)",
            }}
          />
        </div>
      )}
    </div>
  );
}
