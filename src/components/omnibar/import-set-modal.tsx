"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import { formatStatPointSpread } from "@/lib/calc/stat-calc";
import { parseShowdownSets } from "@/lib/parser/showdown-import";
import type { ImportedSet } from "@/lib/types";
import { getCssDurationMs } from "@/lib/ui/transition-duration";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

interface ImportSetModalProps {
  onClose: () => void;
}

function SetPreviewCard({ set }: { set: ImportedSet }) {
  const statPointText = formatStatPointSpread(set.statPoints);
  const details = [
    set.ability,
    `${set.nature} Lv. ${set.level}`,
    set.teraType ? `Tera: ${set.teraType}` : null,
  ].filter(Boolean);

  return (
    <li className="theme-subpanel rounded-lg p-3">
      <div className="text-sm font-medium">
        {set.nickname ? (
          <>
            {set.nickname}{" "}
            <span className="theme-text-dim font-normal">
              ({set.speciesName})
            </span>
          </>
        ) : (
          set.speciesName
        )}
        {set.item ? (
          <span className="theme-text-dim font-normal"> @ {set.item}</span>
        ) : null}
      </div>
      {details.length ? (
        <div className="theme-text-dim mt-1 text-xs">
          {details.join(" / ")}
        </div>
      ) : null}
      <div className="theme-text-dim mt-0.5 text-xs">{statPointText}</div>
      {set.moves.length > 0 ? (
        <div className="theme-text-faint mt-1 text-xs">
          {set.moves.join(" / ")}
        </div>
      ) : null}
    </li>
  );
}

export function ImportSetModal({ onClose }: ImportSetModalProps) {
  const { dictionary } = useI18n();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ImportedSet[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const saveSets = useTeamStore((state) => state.saveSets);
  const recompute = useOmniStore((state) => state.recompute);

  const close = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      return;
    }

    setClosing(true);
    closeTimeoutRef.current = window.setTimeout(
      onClose,
      getCssDurationMs("--modal-close-dur", 150),
    );
  }, [onClose]);

  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }

      body.style.overflow = previousOverflow;
    };
  }, []);

  const handleParse = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const sets = parseShowdownSets(trimmed);
    if (sets.length === 0) {
      setParseError(dictionary.importSetModal.parseError);
      setParsed([]);
      return;
    }

    setParseError(null);
    setParsed(sets);
  }, [dictionary.importSetModal.parseError, text]);

  const handleSave = useCallback(() => {
    if (parsed.length === 0) {
      return;
    }

    saveSets(parsed);
    recompute();
    close();
  }, [close, parsed, recompute, saveSets]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        close();
      }
    },
    [close],
  );

  const portalTarget = typeof document === "undefined" ? null : document.body;

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dictionary.importSetModal.dialogAria}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={handleBackdropClick}
    >
      <div
        className={`theme-panel theme-modal-shell t-modal max-w-lg overflow-hidden ${
          closing ? "is-closing" : "is-open"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <h2 className="text-base font-semibold">
              {dictionary.importSetModal.title}
            </h2>
            <p className="theme-text-dim mt-1 text-sm">
              {dictionary.importSetModal.description}
            </p>
          </div>
          <button
            type="button"
            aria-label={dictionary.importSetModal.closeAria}
            onClick={close}
            className="theme-icon-button theme-icon-button-sm -mr-1"
          >
            <X aria-hidden="true" size={15} strokeWidth={2.1} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 scrollbar-none">
          <textarea
            className="theme-control theme-field-sm theme-input w-full resize-none p-3 font-mono text-sm outline-none"
            rows={9}
            spellCheck={false}
            placeholder={
              "Politoed @ Mystic Water\nAbility: Drizzle\nLevel: 50\nEVs: 32 HP / 1 Def / 13 SpA / 1 SpD / 19 Spe\nModest Nature\n- Muddy Water\n- Ice Beam\n- Protect\n- Helping Hand"
            }
            value={text}
            onChange={(event) => {
              setText(event.currentTarget.value);
              if (parsed.length > 0 || parseError) {
                setParsed([]);
                setParseError(null);
              }
            }}
          />

          {parseError ? (
            <p className="mt-2 text-sm" style={{ color: "var(--accent-strong)" }}>
              {parseError}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleParse}
              disabled={!text.trim()}
              className="theme-icon-button theme-toolbar-button disabled:cursor-not-allowed disabled:opacity-40"
            >
              {dictionary.importSetModal.parse}
            </button>
            {parsed.length > 0 ? (
              <button
                type="button"
                onClick={handleSave}
                className="theme-chip-active theme-toolbar-button font-medium"
              >
                {dictionary.importSetModal.saveSets(parsed.length)}
              </button>
            ) : null}
            <button
              type="button"
              onClick={close}
              className="theme-icon-button theme-toolbar-button ml-auto"
            >
              {dictionary.importSetModal.cancel}
            </button>
          </div>

          {parsed.length > 0 ? (
            <div className="theme-divider mt-5 border-t pt-4">
              <div className="theme-section-title mb-3">
                {dictionary.importSetModal.preview(parsed.length)}
              </div>
              <ul className="space-y-2">
                {parsed.map((set, index) => (
                  <SetPreviewCard
                    key={`${set.speciesId}-${set.nickname ?? ""}-${index}`}
                    set={set}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
