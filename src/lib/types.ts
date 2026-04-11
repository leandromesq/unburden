export interface RegulationEntry {
  id: string;
  name: string;
  seasons: string[];
  dateRange: string;
  allowedPokemonIds: string[];
}

export type BulkArchetype = "glass" | "mid" | "tank";

export type GlobalEffect =
  | "rain"
  | "sun"
  | "sand"
  | "snow"
  | "electric_terrain"
  | "grassy_terrain"
  | "psychic_terrain"
  | "misty_terrain"
  | "trick_room"
  | "gravity";

export type SideEffect =
  | "reflect"
  | "light_screen"
  | "aurora_veil"
  | "protect"
  | "helping_hand"
  | "tailwind"
  | "friend_guard"
  | "battery"
  | "power_spot";

export type SuggestionSlot =
  | "attacker_pokemon"
  | "attacker_move"
  | "attacker_modifier_or_item_or_ability"
  | "separator"
  | "defender_pokemon"
  | "defender_modifier_or_item_or_ability"
  | "global_modifier";

export interface VgcMetaProfile {
  pokemonId: string;
  defaultItem: string;
  defaultAbility: string;
  defaultMove: string;
  commonMoves?: string[];
  commonAbilities?: string[];
  commonItems?: string[];
}

export interface ParsedCommand {
  attacker: string;
  move: string;
  defender: string;
  attackerStatMod: number;
  defenderStatMod: number;
  attackerSpeedMod: number;
  defenderSpeedMod: number;
  attackerCurrentHpPercent?: number;
  defenderCurrentHpPercent?: number;
  isCriticalHit: boolean;
  globalEffects: GlobalEffect[];
  attackerSideEffects: SideEffect[];
  defenderSideEffects: SideEffect[];
  attackerItem?: string;
  defenderItem?: string;
  attackerNature?: string;
  attackerAbility?: string;
  defenderNature?: string;
  defenderAbility?: string;
  attackerInvestment?: "auto" | "max_atk" | "max_spa";
  defenderInvestment?: "auto" | "max_def" | "max_spd";
  isDoubleTarget: boolean;
}

export interface DamageResult {
  archetype: BulkArchetype;
  minPercentage: number;
  maxPercentage: number;
  koChanceText: string;
  showdownText: string;
  contextText: string;
  damageText: string;
  assumptions: string[];
}

export interface PokemonEntry {
  id: string;
  name: string;
  aliases: string[];
  types: string[];
  abilities: string[];
  isMega?: boolean;
  requiredItem?: string;
  baseSpeciesId?: string;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  defaultFormOf?: string;
}

export interface MoveEntry {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  category: string;
  basePower: number;
  accuracy: number | null;
  target: string;
  isSpread: boolean;
}

export interface LearnsetEntry {
  pokemonId: string;
  moveIds: string[];
}

export interface FormAliasEntry {
  alias: string;
  pokemonId: string;
}

export interface SuggestionState {
  slot: SuggestionSlot;
  ghostText: string;
  completionText: string;
}

export interface SuggestionOption {
  type: "pokemon" | "move" | "ability" | "modifier" | "separator" | "item";
  value: string;
  label: string;
  applyText: string;
}

export interface ActiveChipTokens {
  attacker: string[];
  defender: string[];
  global: string[];
}

export interface StatSpread {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface ImportedSet {
  speciesId: string;
  speciesName: string;
  nickname?: string;
  item?: string;
  ability?: string;
  level: number;
  nature: string;
  statPoints: StatSpread;
  evs: StatSpread;
  ivs: StatSpread;
  moves: string[];
  teraType?: string;
}
