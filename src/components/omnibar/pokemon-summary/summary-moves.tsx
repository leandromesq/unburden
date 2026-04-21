import { MoveChip } from "@/components/omnibar/pokemon-summary/shared";
import { moveById, normalizeId } from "@/lib/data/loaders";
import { resolveMoveEntity } from "@/lib/parser/fuse-indexes";
import type { ImportedSet } from "@/lib/types";
import type { SummarySide } from "@/lib/parser/input-mutations";

interface SummaryMovesProps {
  importedSet: ImportedSet;
  activeMoveId: string | null;
  side: SummarySide;
  onSelectMove: (moveName: string) => void;
}

export function SummaryMoves({
  importedSet,
  activeMoveId,
  side,
  onSelectMove,
}: SummaryMovesProps) {
  if ((importedSet.moves ?? []).length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <div className="theme-text-faint mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
        Moves
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {(importedSet.moves ?? []).map((moveName) => {
          const resolvedEntry =
            moveById.get(normalizeId(moveName)) ??
            resolveMoveEntity(moveName)?.entry ??
            null;
          const isActive =
            activeMoveId !== null &&
            resolvedEntry !== null &&
            resolvedEntry.id === activeMoveId;

          return (
            <MoveChip
              key={moveName}
              moveName={moveName}
              moveType={resolvedEntry?.type ?? null}
              isActive={isActive}
              disabled={side !== "attacker"}
              onClick={
                side === "attacker" ? () => onSelectMove(moveName) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
