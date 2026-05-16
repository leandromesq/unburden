"use client";

import type { CSSProperties, ReactNode } from "react";

import { MoveTypeIcon } from "@/components/omnibar/move-type-icon";
import { SearchableCombobox } from "@/components/omnibar/searchable-combobox";
import { PokemonSprite } from "@/components/omnibar/pokemon-summary/pokemon-sprite";
import {
  formatNatureWithDescription,
  SUMMARY_NATURES,
} from "@/components/omnibar/pokemon-summary/shared";
import { getPokemonTypeColor } from "@/lib/ui/type-colors";

function formatTypeName(type: string) {
  return type.slice(0, 1).toUpperCase() + type.slice(1).toLowerCase();
}

interface SummaryIdentityCardProps {
  name: string;
  spriteSources: string[];
  primaryType: string | null;
  types: string[];
  speciesInput: string;
  speciesOptions: string[];
  abilityInput: string;
  abilityOptions: string[];
  itemInput: string;
  itemOptions: string[];
  nature: string;
  setNameField?: ReactNode;
  switchAction?: ReactNode;
  statusField?: ReactNode;
  onInputSpecies: (value: string) => void;
  onCommitSpecies: (value: string) => void;
  onInputItem: (value: string) => void;
  onInputAbility: (value: string) => void;
  onCommitItem: (value: string) => void;
  onCommitAbility: (value: string) => void;
  onCommitNature: (value: string) => void;
}

export function SummaryIdentityCard({
  name,
  spriteSources,
  primaryType,
  types,
  speciesInput,
  speciesOptions,
  abilityInput,
  abilityOptions,
  itemInput,
  itemOptions,
  nature,
  setNameField,
  switchAction,
  statusField,
  onInputSpecies,
  onCommitSpecies,
  onInputItem,
  onInputAbility,
  onCommitItem,
  onCommitAbility,
  onCommitNature,
}: SummaryIdentityCardProps) {
  return (
    <div className="mt-3 grid gap-2.5 sm:grid-cols-[5rem_minmax(0,1fr)] sm:items-start">
      <div className="theme-summary-sprite-shell flex h-16 w-16 items-center justify-center rounded-lg p-2 sm:row-span-2 sm:h-full sm:min-h-20 sm:w-20">
        <PokemonSprite
          sources={spriteSources}
          name={name}
          primaryType={primaryType}
        />
      </div>

      <div className="min-w-0">
        <SearchableCombobox
          label="Pokemon"
          hideLabel
          compact
          name="pokemon-species"
          value={speciesInput}
          options={speciesOptions}
          placeholder="Pokemon"
          onChange={onInputSpecies}
          onInputChange={onInputSpecies}
          onSelectOption={onCommitSpecies}
          onBlur={onCommitSpecies}
        />

        {types.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {types.map((type) => (
              <span
                key={type}
                className="theme-type-badge inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium"
                style={{ "--type-color": getPokemonTypeColor(type) } as CSSProperties}
              >
                <MoveTypeIcon type={type} size={12} />
                <span>{formatTypeName(type)}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {setNameField ? <div className="min-w-0">{setNameField}</div> : null}

      {switchAction ? <div className="w-full sm:self-start">{switchAction}</div> : null}

      <div className="min-w-0">
        <SearchableCombobox
          label="Item"
          hideLabel
          compact
          name="pokemon-item"
          value={itemInput}
          options={itemOptions}
          placeholder="Item"
          onChange={onInputItem}
          onInputChange={onInputItem}
          onSelectOption={onCommitItem}
          onBlur={onCommitItem}
        />
      </div>

      {statusField ? <div className="w-full sm:self-start">{statusField}</div> : null}

      <div className="min-w-0">
        <SearchableCombobox
          label="Ability"
          hideLabel
          compact
          name="pokemon-ability"
          value={abilityInput}
          options={abilityOptions}
          placeholder="Ability"
          onChange={onInputAbility}
          onInputChange={onInputAbility}
          onSelectOption={onCommitAbility}
          onBlur={onCommitAbility}
          showAllOptions
        />
      </div>

      <div className="min-w-0 sm:col-start-2">
        <SearchableCombobox
          label="Nature"
          hideLabel
          compact
          name="pokemon-nature"
          value={formatNatureWithDescription(nature)}
          options={SUMMARY_NATURES.map((entry) =>
            formatNatureWithDescription(entry),
          )}
          placeholder="Nature"
          onChange={() => { }}
          onSelectOption={onCommitNature}
          onBlur={onCommitNature}
          showAllOptions
        />
      </div>
    </div>
  );
}
