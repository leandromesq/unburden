"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { Bug, X } from "lucide-react";

import { reportBug } from "@/app/actions/report-bug";
import { useI18n } from "@/i18n/I18nProvider";
import { getCssDurationMs } from "@/lib/ui/transition-duration";
import { useOmniStore } from "@/store/use-omni-store";

const initialReportBugState = {
  status: "idle" as const,
  message: "",
};

function SubmitButton({
  pending,
  idleLabel,
  pendingLabel,
}: {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="theme-chip-active theme-toolbar-button font-medium"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function BugReportButton() {
  const { locale, dictionary } = useI18n();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [state, formAction, pending] = useActionState(
    reportBug,
    initialReportBugState,
  );
  const input = useOmniStore((currentState) => currentState.input);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const openedRef = useRef(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const titleId = "bug-report-title";
  const descriptionId = "bug-report-description";
  const statusId = "bug-report-status";
  const pageUrl = typeof window === "undefined" ? "" : window.location.href;
  const userAgent =
    typeof window === "undefined" ? "" : window.navigator.userAgent;

  const close = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      return;
    }

    setClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      startTransition(() => {
        setOpen(false);
        setClosing(false);
      });
      closeTimeoutRef.current = null;
    }, getCssDurationMs("--modal-close-dur", 150));
  }, []);
  const closeFromDocumentEvent = useEffectEvent(close);

  useEffect(() => {
    if (closing) {
      return;
    }

    if (!open) {
      if (openedRef.current) {
        buttonRef.current?.focus();
        openedRef.current = false;
      }
      return;
    }

    openedRef.current = true;

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [closing, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFromDocumentEvent();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="bug-report-dialog"
        onClick={() => {
          if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }

          startTransition(() => {
            setClosing(false);
            setOpen(true);
          });
        }}
        className="theme-icon-button theme-toolbar-button gap-1 text-sm whitespace-nowrap sm:gap-1.5 sm:px-3"
      >
        <Bug aria-hidden="true" size={14} strokeWidth={1.9} />
        <span>{dictionary.bugReport.openButton}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label={dictionary.bugReport.closeAria}
            className="absolute inset-0 cursor-default bg-[var(--overlay-scrim)]"
            onClick={() => close()}
          />
          <div
            id="bug-report-dialog"
            className={`theme-panel theme-modal-shell t-modal relative max-w-xl overflow-hidden ${
              closing ? "is-closing" : "is-open"
            }`}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <div>
                <h2 id={titleId} className="text-base font-semibold">
                  {dictionary.bugReport.title}
                </h2>
                <p id={descriptionId} className="theme-text-dim mt-1 text-sm">
                  {dictionary.bugReport.description}
                </p>
              </div>
              <button
                type="button"
                aria-label={dictionary.bugReport.closeAria}
                onClick={() => close()}
                className="theme-icon-button theme-icon-button-sm -mr-1"
              >
                <X aria-hidden="true" size={15} strokeWidth={2.1} />
              </button>
            </div>

            <form
              action={formAction}
              className="max-h-[70vh] overflow-y-auto px-6 pb-6 scrollbar-none"
            >
              <input
                type="text"
                name="teamName"
                tabIndex={-1}
                autoComplete="off"
                className="sr-only"
                aria-hidden="true"
              />
              <label
                htmlFor="bug-report-description"
                className="theme-text-dim mb-2 block text-sm"
              >
                {dictionary.bugReport.questionLabel}
              </label>
              <textarea
                id="bug-report-description"
                ref={textareaRef}
                name="description"
                required
                minLength={10}
                maxLength={4000}
                rows={7}
                className="theme-control theme-input w-full resize-none rounded-lg p-3 text-sm outline-none"
                placeholder={dictionary.bugReport.placeholder}
              />

              <input type="hidden" name="prompt" value={input} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="pageUrl" value={pageUrl} />
              <input type="hidden" name="userAgent" value={userAgent} />

              <div className="theme-subpanel mt-4 rounded-lg p-3">
                <div className="theme-text-muted text-sm font-medium">
                  {dictionary.bugReport.attachedContext}
                </div>
                <div className="theme-text-dim mt-2 text-xs">
                  {dictionary.bugReport.currentPrompt}:{" "}
                  <span
                    className="font-mono"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {input || "n/a"}
                  </span>
                </div>
              </div>

              <p className="theme-text-dim mt-3 text-xs leading-5">
                {dictionary.bugReport.privacy}
              </p>

              <p
                id={statusId}
                aria-live="polite"
                className={`mt-3 text-sm ${
                  state.status === "error"
                    ? "theme-ko-medium"
                    : state.status === "success"
                      ? "theme-text-muted"
                      : "theme-text-dim"
                }`}
              >
                {state.message ||
                  dictionary.bugReport.idleMessage}
              </p>
              {state.status === "success" && state.issueUrl ? (
                <a
                  href={state.issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="theme-text-muted mt-2 inline-flex text-sm underline underline-offset-4"
                >
                  {dictionary.bugReport.viewIssue}
                </a>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <SubmitButton
                  pending={pending}
                  idleLabel={dictionary.bugReport.send}
                  pendingLabel={dictionary.bugReport.sending}
                />
                <button
                  type="button"
                  onClick={() => close()}
                  className="theme-icon-button theme-toolbar-button text-sm"
                >
                  {dictionary.bugReport.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
