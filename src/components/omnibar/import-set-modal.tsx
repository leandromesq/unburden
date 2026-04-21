"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import { formatStatPointSpread } from "@/lib/calc/stat-calc";
import { parseShowdownSets } from "@/lib/parser/showdown-import";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";
import type { ImportedSet } from "@/lib/types";

interface ImportSetModalProps {
  onClose: () => void;
}

function SetPreviewCard({ set }: { set: ImportedSet }) {
  const statPointText = formatStatPointSpread(set.statPoints);

  return (
    <li className="theme-subpanel rounded-xl p-3">
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
        {set.item && (
          <span className="theme-text-dim font-normal"> @ {set.item}</span>
        )}
      </div>
      <div className="theme-text-dim mt-1 text-xs">
        {set.ability ? `${set.ability} · ` : ""}
        {set.nature} · Lv. {set.level}
        {set.teraType ? ` · Tera: ${set.teraType}` : ""}
      </div>
      <div className="theme-text-dim mt-0.5 text-xs">{statPointText}</div>
      {set.moves.length > 0 && (
        <div className="theme-text-faint mt-1 text-xs">
          {set.moves.join(" / ")}
        </div>
      )}
    </li>
  );
}

export function ImportSetModal({ onClose }: ImportSetModalProps) {
  const { dictionary } = useI18n();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ImportedSet[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const saveSets = useTeamStore((state) => state.saveSets);
  const recompute = useOmniStore((state) => state.recompute);

  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, []);

  const handleParse = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const sets = parseShowdownSets(trimmed);
    if (sets.length === 0) {
      setParseError(dictionary.importSetModal.parseError);
      setParsed([]);
    } else {
      setParseError(null);
      setParsed(sets);
    }
  }, [dictionary.importSetModal.parseError, text]);

  const handleSave = useCallback(() => {
    if (parsed.length > 0) {
      saveSets(parsed);
      recompute();
      onClose();
    }
  }, [parsed, saveSets, recompute, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
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
        className="theme-panel w-full max-w-lg overflow-hidden rounded-3xl"
        style={{ boxShadow: "var(--shadow-overlay)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-base font-semibold">
            {dictionary.importSetModal.title}
          </h2>
          <button
            type="button"
            aria-label={dictionary.importSetModal.closeAria}
            onClick={onClose}
            className="theme-icon-button -mr-1 flex h-8 w-8 items-center justify-center rounded-full"
          >
            <X aria-hidden="true" size={15} strokeWidth={2.1} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 scrollbar-none">
          <p className="theme-text-dim mb-3 text-sm">
            {dictionary.importSetModal.description}
          </p>

          <textarea
            className="theme-control theme-input w-full resize-none rounded-2xl p-3 font-mono text-sm outline-none"
            rows={9}
            spellCheck={false}
            placeholder={
              "Politoed @ Mystic Water\nAbility: Drizzle\nLevel: 50\nEVs: 32 HP / 1 Def / 13 SpA / 1 SpD / 19 Spe\nModest Nature\n- Muddy Water\n- Ice Beam\n- Protect\n- Helping Hand"
            }
            value={text}
            onChange={(e) => {
              setText(e.currentTarget.value);
              if (parsed.length > 0 || parseError) {
                setParsed([]);
                setParseError(null);
              }
            }}
          />

          {parseError && (
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--accent-strong)" }}
            >
              {parseError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleParse}
              disabled={!text.trim()}
              className="theme-chip rounded-full px-4 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              {dictionary.importSetModal.parse}
            </button>
            {parsed.length > 0 && (
              <button
                type="button"
                onClick={handleSave}
                className="theme-chip-active rounded-full px-4 py-1.5 text-sm font-medium"
              >
                {dictionary.importSetModal.saveSets(parsed.length)}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="theme-chip ml-auto rounded-full px-4 py-1.5 text-sm"
            >
              {dictionary.importSetModal.cancel}
            </button>
          </div>

          {parsed.length > 0 && (
            <div className="theme-divider mt-5 border-t pt-4">
              <div className="theme-text-dim mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]">
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
          )}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
