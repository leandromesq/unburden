"use client";

import type { ReactNode } from "react";

import { SearchableCombobox } from "@/components/omnibar/searchable-combobox";
import { PokemonSprite } from "@/components/omnibar/pokemon-summary/pokemon-sprite";
import {
  formatNatureWithDescription,
  SUMMARY_NATURES,
} from "@/components/omnibar/pokemon-summary/shared";

interface SummaryIdentityCardProps {
  name: string;
  spriteSources: string[];
  primaryType: string | null;
  speciesInput: string;
  speciesOptions: string[];
  ability: string | null;
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
  speciesInput,
  speciesOptions,
  ability,
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
    <div className="mt-3 grid gap-2 sm:grid-cols-[5rem_minmax(0,1fr)] sm:items-start">
      <div className="theme-subpanel flex h-16 w-16 items-center justify-center rounded-xl p-2 sm:row-span-2 sm:h-full sm:min-h-20 sm:w-20">
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
