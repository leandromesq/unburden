"use client";

import { Circle, CircleDot } from "lucide-react";

import { MoveTypeIcon } from "@/components/omnibar/move-type-icon";
import { SearchableCombobox } from "@/components/omnibar/searchable-combobox";
import { moveById, normalizeId } from "@/lib/data/loaders";
import { resolveMoveEntity } from "@/lib/parser/fuse-indexes";
import type { SummarySide } from "@/lib/parser/input-mutations";

interface SummaryMovesProps {
  activeMoveId: string | null;
  side: SummarySide;
  moveInputs: string[];
  moveOptions: string[];
  moveInputTypes: Array<string | null>;
  onInputMove: (index: number, value: string) => void;
  onCommitMove: (index: number, value: string) => void;
  onSelectMove: (index: number, moveName: string) => void;
}

function resolveMoveEntry(moveName: string) {
  return (
    moveById.get(normalizeId(moveName)) ??
    resolveMoveEntity(moveName)?.entry ??
    null
  );
}

export function SummaryMoves({
  activeMoveId,
  side,
  moveInputs,
  moveOptions,
  moveInputTypes,
  onInputMove,
  onCommitMove,
  onSelectMove,
}: SummaryMovesProps) {
  return (
    <div className="theme-divider mt-4 border-t pt-3">
      <div className="mb-2">
        <div className="theme-data-label">Moves</div>
      </div>

      <div className="grid gap-1.5">
        {moveInputs.map((moveName, index) => {
          const resolvedEntry = resolveMoveEntry(moveName);
          const isActive =
            side === "attacker" &&
            activeMoveId !== null &&
            resolvedEntry !== null &&
            resolvedEntry.id === activeMoveId;
          const moveLabel = moveName.trim() || `move ${index + 1}`;

          return (
            <div key={index} className="flex items-center gap-2">
              {side === "attacker" ? (
                <button
                  type="button"
                  aria-label={`Use ${moveLabel} for calc`}
                  aria-pressed={isActive}
                  disabled={!moveName.trim()}
                  onClick={() => {
                    if (moveName.trim()) {
                      onSelectMove(index, moveName);
                    }
                  }}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isActive
                      ? "theme-chip-active border-transparent"
                      : "theme-control"
                  } ${!moveName.trim() ? "cursor-not-allowed opacity-45" : ""}`}
                >
                  {isActive ? (
                    <CircleDot aria-hidden="true" size={16} strokeWidth={2} />
                  ) : (
                    <Circle aria-hidden="true" size={16} strokeWidth={1.8} />
                  )}
                </button>
              ) : null}

              <div className="min-w-0 flex-1">
                <SearchableCombobox
                  label={`Move ${index + 1}`}
                  hideLabel
                  compact
                  name={`move-${index + 1}`}
                  value={moveName}
                  options={moveOptions}
                  placeholder={`Move ${index + 1}`}
                  onChange={(value) => onInputMove(index, value)}
                  onInputChange={(value) => onInputMove(index, value)}
                  onSelectOption={(value) => onCommitMove(index, value)}
                  onBlur={(value) => onCommitMove(index, value)}
                  renderOption={(option) => {
                    const moveType = resolveMoveEntry(option)?.type ?? null;

                    return (
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate">{option}</span>
                        <MoveTypeIcon
                          type={moveType}
                          size={15}
                          className="shrink-0 opacity-90"
                        />
                      </div>
                    );
                  }}
                  endAdornment={
                    <MoveTypeIcon
                      type={moveInputTypes[index]}
                      size={15}
                      className="shrink-0 opacity-90"
                    />
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
