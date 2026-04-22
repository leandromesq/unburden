import {
  formatNatureWithDescription,
} from "@/components/omnibar/pokemon-summary/shared";
import { MoveTypeIcon } from "@/components/omnibar/move-type-icon";
import { PokemonSprite } from "@/components/omnibar/pokemon-summary/pokemon-sprite";
import type { SummarySide } from "@/lib/parser/input-mutations";

interface SummaryIdentityCardProps {
  name: string;
  spriteSources: string[];
  primaryType: string | null;
  ability: string | null;
  item: string | null;
  move: string | null;
  moveType: string | null;
  side: SummarySide;
  displayNature: string | null;
}

export function SummaryIdentityCard({
  name,
  spriteSources,
  primaryType,
  ability,
  item,
  move,
  moveType,
  side,
  displayNature,
}: SummaryIdentityCardProps) {
  return (
    <div className="mt-3 flex min-w-0 items-start gap-3 sm:items-center">
      <div className="theme-subpanel-strong flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl p-2 sm:h-20 sm:w-20">
        <PokemonSprite
          sources={spriteSources}
          name={name}
          primaryType={primaryType}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-medium">{name}</div>
        <div className="theme-text-dim mt-1 break-words text-sm">
          Ability: <span className="theme-text-muted">{ability ?? "—"}</span>
        </div>
        {item && (
          <div className="theme-text-dim mt-0.5 break-words text-sm">
            Item: <span className="theme-text-muted">{item}</span>
          </div>
        )}
        {side === "attacker" && move && (
          <div className="theme-text-dim mt-0.5 flex min-w-0 items-start gap-1.5 text-sm">
            <span className="min-w-0 break-words">
              Move: <span className="theme-text-muted">{move}</span>
            </span>
            <MoveTypeIcon
              type={moveType}
              size={17}
              className="shrink-0 opacity-90"
            />
          </div>
        )}
        {displayNature && (
          <div className="theme-text-dim mt-0.5 break-words text-xs">
            {formatNatureWithDescription(displayNature)}
          </div>
        )}
      </div>
    </div>
  );
}
