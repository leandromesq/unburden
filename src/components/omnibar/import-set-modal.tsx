"use client";

import { useState, useCallback } from "react";

import { parseShowdownSets } from "@/lib/parser/showdown-import";
import { useTeamStore } from "@/store/use-team-store";
import type { ImportedSet } from "@/lib/types";

interface ImportSetModalProps {
  onClose: () => void;
}

function SetPreviewCard({ set }: { set: ImportedSet }) {
  const evParts =
    (
      [
        ["hp", "HP"],
        ["atk", "Atk"],
        ["def", "Def"],
        ["spa", "SpA"],
        ["spd", "SpD"],
        ["spe", "Spe"],
      ] as const
    )
      .filter(([key]) => set.evs[key] > 0)
      .map(([key, label]) => `${set.evs[key]} ${label}`)
      .join(" / ") || "No EVs";

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
      <div className="theme-text-dim mt-0.5 text-xs">{evParts}</div>
      {set.moves.length > 0 && (
        <div className="theme-text-faint mt-1 text-xs">
          {set.moves.join(" / ")}
        </div>
      )}
    </li>
  );
}

export function ImportSetModal({ onClose }: ImportSetModalProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ImportedSet[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const saveSets = useTeamStore((state) => state.saveSets);

  const handleParse = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const sets = parseShowdownSets(trimmed);
    if (sets.length === 0) {
      setParseError(
        "No valid Pokémon sets found. Make sure you used Showdown export format.",
      );
      setParsed([]);
    } else {
      setParseError(null);
      setParsed(sets);
    }
  }, [text]);

  const handleSave = useCallback(() => {
    if (parsed.length > 0) {
      saveSets(parsed);
      onClose();
    }
  }, [parsed, saveSets, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import Pokémon Set"
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
          <h2 className="text-base font-semibold">Import Pokémon Set</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="theme-text-dim -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-xl font-light leading-none transition-colors hover:bg-(--surface-3)"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 scrollbar-none">
          <p className="theme-text-dim mb-3 text-sm">
            Paste a Showdown export below. Full teams (up to 6 sets separated by
            blank lines) are supported.
          </p>

          <textarea
            className="theme-subpanel theme-input w-full resize-none rounded-2xl border p-3 font-mono text-sm outline-none"
            rows={9}
            spellCheck={false}
            placeholder={
              "Flutter Mane @ Choice Specs\nAbility: Protosynthesis\nLevel: 50\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\nIVs: 0 Atk\n- Moonblast\n- Shadow Ball\n- Calm Mind\n- Protect"
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
              Parse
            </button>
            {parsed.length > 0 && (
              <button
                type="button"
                onClick={handleSave}
                className="theme-chip-active rounded-full px-4 py-1.5 text-sm font-medium"
              >
                Save {parsed.length} set{parsed.length !== 1 ? "s" : ""}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="theme-chip ml-auto rounded-full px-4 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>

          {parsed.length > 0 && (
            <div className="theme-divider mt-5 border-t pt-4">
              <div className="theme-text-dim mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]">
                Preview — {parsed.length} set{parsed.length !== 1 ? "s" : ""}{" "}
                found
              </div>
              <ul className="space-y-2">
                {parsed.map((set) => (
                  <SetPreviewCard key={set.speciesId} set={set} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
