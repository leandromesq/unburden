import {
  formatNatureWithDescription,
} from "@/components/omnibar/pokemon-summary/shared";
import { PokemonSprite } from "@/components/omnibar/pokemon-summary/pokemon-sprite";
import type { SummarySide } from "@/lib/parser/input-mutations";

interface SummaryIdentityCardProps {
  name: string;
  spriteSources: string[];
  primaryType: string | null;
  ability: string | null;
  item: string | null;
  move: string | null;
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
  side,
  displayNature,
}: SummaryIdentityCardProps) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="theme-subpanel-strong flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl p-2">
        <PokemonSprite
          sources={spriteSources}
          name={name}
          primaryType={primaryType}
        />
      </div>
      <div className="min-w-0">
        <div className="truncate text-lg font-medium">{name}</div>
        <div className="theme-text-dim mt-1 text-sm">
          Ability: <span className="theme-text-muted">{ability ?? "—"}</span>
        </div>
        {item && (
          <div className="theme-text-dim mt-0.5 text-sm">
            Item: <span className="theme-text-muted">{item}</span>
          </div>
        )}
        {side === "attacker" && move && (
          <div className="theme-text-dim mt-0.5 text-sm">
            Move: <span className="theme-text-muted">{move}</span>
          </div>
        )}
        {displayNature && (
          <div className="theme-text-dim mt-0.5 text-xs">
            {formatNatureWithDescription(displayNature)}
          </div>
        )}
      </div>
    </div>
  );
}
