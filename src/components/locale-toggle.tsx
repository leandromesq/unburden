"use client";

import {
  startTransition,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import { APP_LOCALES, type AppLocale } from "@/i18n/locales";

export function LocaleToggle() {
  const { locale, dictionary, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasOpenedRef = useRef(false);
  const menuId = useId();
  const options = APP_LOCALES.map((value) => ({
    value,
    label: dictionary.localeToggle.options[value],
  }));
  const currentOption =
    options.find((option) => option.value === locale) ?? options[0];

  const closeMenu = () => {
    startTransition(() => {
      setOpen(false);
    });
  };

  useEffect(() => {
    if (!open) {
      if (hasOpenedRef.current) {
        buttonRef.current?.focus();
        hasOpenedRef.current = false;
      }
      return;
    }

    hasOpenedRef.current = true;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelectLocale = (nextLocale: AppLocale) => {
    startTransition(() => {
      setLocale(nextLocale);
      setOpen(false);
    });
  };

  return (
    <div ref={containerRef} className="relative z-30">
      <button
        ref={buttonRef}
        type="button"
        aria-label={dictionary.localeToggle.label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          startTransition(() => {
            setOpen((current) => !current);
          });
        }}
        className={`theme-control inline-flex h-8 min-w-[9rem] items-center justify-between gap-2 rounded-lg border px-3 text-xs font-medium ${
          open
            ? "border-[var(--accent-border)] bg-[color-mix(in_srgb,var(--surface-4)_86%,transparent)] text-[var(--text)] shadow-[0_0_0_3px_var(--accent-softer)]"
            : "text-[var(--text-dim)]"
        }`}
        style={{ background: "var(--surface-3)" }}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Globe2
            aria-hidden="true"
            size={13}
            strokeWidth={1.9}
            className={open ? "text-[var(--accent-strong)]" : ""}
          />
          <span className="truncate">{currentOption.label}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          size={13}
          strokeWidth={2}
          className={`shrink-0 transition-transform ${
            open ? "rotate-180 text-[var(--accent-strong)]" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={dictionary.localeToggle.label}
          className="theme-menu absolute left-0 top-[calc(100%+0.35rem)] z-20 min-w-full overflow-hidden rounded-xl p-1"
          style={{ background: "var(--surface-3)" }}
        >
          {options.map((option) => {
            const active = option.value === locale;

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => handleSelectLocale(option.value)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
                  active
                    ? "border-[var(--line-strong)] bg-[var(--surface-4)] text-[var(--text)]"
                    : "border-transparent text-[var(--text-dim)] hover:border-[var(--line)] hover:bg-[var(--surface-4)] hover:text-[var(--text)]"
                }`}
              >
                <span>{option.label}</span>
                {active ? (
                  <Check
                    aria-hidden="true"
                    size={14}
                    strokeWidth={2.2}
                    className="text-[var(--accent-strong)]"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
