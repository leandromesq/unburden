import {
  PokemonSprite,
  formatNatureWithDescription,
} from "@/components/omnibar/pokemon-summary/shared";
import type { SummarySide } from "@/lib/parser/input-mutations";

export interface SummaryIdentityCardProps {
  name: string;
  spriteSources: string[];
  ability: string | null;
  item: string | null;
  move: string | null;
  side: SummarySide;
  importedNature: string | null;
}

export function SummaryIdentityCard({
  name,
  spriteSources,
  ability,
  item,
  move,
  side,
  importedNature,
}: SummaryIdentityCardProps) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="theme-subpanel-strong flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl p-2">
        <PokemonSprite key={name} sources={spriteSources} name={name} />
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
        {importedNature && (
          <div className="theme-text-dim mt-0.5 text-xs">
            {formatNatureWithDescription(importedNature)}
          </div>
        )}
      </div>
    </div>
  );
}
