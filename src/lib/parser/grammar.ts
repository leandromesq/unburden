import type {
  ActiveChipTokens,
  GlobalEffect,
  PokemonStatus,
  SideEffect,
  StatSpread,
  VgcMetaProfile,
} from "@/lib/types";

export type ModifierScope = "attacker" | "defender" | "global";
export type ModifierSection =
  | "multipliers"
  | "stats"
  | "move_effects"
  | "status"
  | "weather"
  | "terrain"
  | "field_effects";

export interface ModifierDefinition {
  scope: ModifierScope;
  token: string;
  label: string;
  section: ModifierSection;
  kind:
    | "stat_mod"
    | "stat_stage"
    | "speed_mod"
    | "nature"
    | "investment"
    | "status"
    | "side_effect"
    | "global_effect";
  statMod?: number;
  statKey?: Exclude<keyof StatSpread, "hp">;
  nature?: string;
  investment?: "max_atk" | "max_spa" | "max_def" | "max_spd";
  status?: PokemonStatus;
  sideEffect?: SideEffect;
  globalEffect?: GlobalEffect;
}

export const ATTACKER_POSITIVE_NATURE = "__ATTACKER_POSITIVE__";
export const ATTACKER_NEGATIVE_NATURE = "__ATTACKER_NEGATIVE__";
export const DEFENDER_POSITIVE_NATURE = "__DEFENDER_POSITIVE__";
export const DEFENDER_NEGATIVE_NATURE = "__DEFENDER_NEGATIVE__";

const EXPLICIT_NATURES = [
  "Hardy",
  "Lonely",
  "Brave",
  "Adamant",
  "Naughty",
  "Bold",
  "Docile",
  "Relaxed",
  "Impish",
  "Lax",
  "Timid",
  "Hasty",
  "Serious",
  "Jolly",
  "Naive",
  "Modest",
  "Mild",
  "Quiet",
  "Bashful",
  "Rash",
  "Calm",
  "Gentle",
  "Sassy",
  "Careful",
  "Quirky",
] as const;

const MODIFIER_ALIASES = new Map<string, string>([
  ["positive-nature", "+nature"],
  ["pos-nature", "+nature"],
  ["negative-nature", "-nature"],
  ["neg-nature", "-nature"],
  ["speed+1", "spe+1"],
  ["speed+2", "spe+2"],
  ["speed+3", "spe+3"],
  ["speed+4", "spe+4"],
  ["speed+5", "spe+5"],
  ["speed+6", "spe+6"],
  ["speed-1", "spe-1"],
  ["speed-2", "spe-2"],
  ["speed-3", "spe-3"],
  ["speed-4", "spe-4"],
  ["speed-5", "spe-5"],
  ["speed-6", "spe-6"],
  ["brn", "burn"],
  ["par", "paralysis"],
  ["psn", "poison"],
  ["slp", "sleep"],
  ["frz", "freeze"],
]);

function buildStatusDefinitions(scope: "attacker" | "defender") {
  return [
    {
      scope,
      token: "burn",
      label: "Burn",
      section: "status",
      kind: "status",
      status: "brn",
    },
    {
      scope,
      token: "paralysis",
      label: "Paralysis",
      section: "status",
      kind: "status",
      status: "par",
    },
    {
      scope,
      token: "poison",
      label: "Poison",
      section: "status",
      kind: "status",
      status: "psn",
    },
    {
      scope,
      token: "sleep",
      label: "Sleep",
      section: "status",
      kind: "status",
      status: "slp",
    },
    {
      scope,
      token: "freeze",
      label: "Freeze",
      section: "status",
      kind: "status",
      status: "frz",
    },
  ] satisfies ModifierDefinition[];
}

function buildStageDefinitions(scope: "attacker" | "defender") {
  const stages: ModifierDefinition[] = [];

  for (let stage = -6; stage <= 6; stage += 1) {
    if (stage === 0) {
      continue;
    }

    const label = stage > 0 ? `+${stage}` : `${stage}`;
    stages.push({
      scope,
      token: label,
      label,
      section: "multipliers",
      kind: "stat_mod",
      statMod: stage,
    });
  }

  return stages;
}

function buildNamedStageDefinitions(scope: "attacker" | "defender") {
  const statDefinitions = [
    ["atk", "Atk"],
    ["def", "Def"],
    ["spa", "SpA"],
    ["spd", "SpD"],
  ] as const;
  const stages: ModifierDefinition[] = [];

  for (const [statKey, statLabel] of statDefinitions) {
    for (let stage = -6; stage <= 6; stage += 1) {
      if (stage === 0) {
        continue;
      }

      const signedStage = stage > 0 ? `+${stage}` : `${stage}`;
      stages.push({
        scope,
        token: `${statKey}${signedStage}`,
        label: `${statLabel} ${signedStage}`,
        section: "multipliers",
        kind: "stat_stage",
        statKey,
        statMod: stage,
      });
    }
  }

  return stages;
}

function buildExplicitNatureDefinitions(scope: "attacker" | "defender") {
  return EXPLICIT_NATURES.map((nature) => ({
    scope,
    token: slugifySymbolValue(nature),
    label: nature,
    section: "stats",
    kind: "nature",
    nature,
  })) satisfies ModifierDefinition[];
}

function buildSpeedStageDefinitions(scope: "attacker" | "defender") {
  const stages: ModifierDefinition[] = [];

  for (let stage = -6; stage <= 6; stage += 1) {
    if (stage === 0) {
      continue;
    }

    const label = stage > 0 ? `Spe +${stage}` : `Spe ${stage}`;
    const token = stage > 0 ? `spe+${stage}` : `spe${stage}`;
    stages.push({
      scope,
      token,
      label,
      section: "multipliers",
      kind: "speed_mod",
      statKey: "spe",
      statMod: stage,
    });
  }

  return stages;
}

const ATTACKER_MODIFIERS: ModifierDefinition[] = [
  ...buildStageDefinitions("attacker"),
  ...buildNamedStageDefinitions("attacker"),
  ...buildSpeedStageDefinitions("attacker"),
  ...buildStatusDefinitions("attacker"),
  {
    scope: "attacker",
    token: "max-atk",
    label: "Max Atk",
    section: "stats",
    kind: "investment",
    investment: "max_atk",
  },
  {
    scope: "attacker",
    token: "max-spa",
    label: "Max SpA",
    section: "stats",
    kind: "investment",
    investment: "max_spa",
  },
  {
    scope: "attacker",
    token: "+nature",
    label: "+ Nature",
    section: "stats",
    kind: "nature",
    nature: ATTACKER_POSITIVE_NATURE,
  },
  {
    scope: "attacker",
    token: "-nature",
    label: "- Nature",
    section: "stats",
    kind: "nature",
    nature: ATTACKER_NEGATIVE_NATURE,
  },
  ...buildExplicitNatureDefinitions("attacker"),
  {
    scope: "attacker",
    token: "helping-hand",
    label: "Helping Hand",
    section: "move_effects",
    kind: "side_effect",
    sideEffect: "helping_hand",
  },
  {
    scope: "attacker",
    token: "tailwind",
    label: "Tailwind",
    section: "move_effects",
    kind: "side_effect",
    sideEffect: "tailwind",
  },
  {
    scope: "attacker",
    token: "battery",
    label: "Battery",
    section: "move_effects",
    kind: "side_effect",
    sideEffect: "battery",
  },
  {
    scope: "attacker",
    token: "power-spot",
    label: "Power Spot",
    section: "move_effects",
    kind: "side_effect",
    sideEffect: "power_spot",
  },
];

const DEFENDER_MODIFIERS: ModifierDefinition[] = [
  ...buildStageDefinitions("defender"),
  ...buildNamedStageDefinitions("defender"),
  ...buildSpeedStageDefinitions("defender"),
  ...buildStatusDefinitions("defender"),
  {
    scope: "defender",
    token: "max-def",
    label: "Max Def",
    section: "stats",
    kind: "investment",
    investment: "max_def",
  },
  {
    scope: "defender",
    token: "max-spd",
    label: "Max SpD",
    section: "stats",
    kind: "investment",
    investment: "max_spd",
  },
  {
    scope: "defender",
    token: "+nature",
    label: "+ Nature",
    section: "stats",
    kind: "nature",
    nature: DEFENDER_POSITIVE_NATURE,
  },
  {
    scope: "defender",
    token: "-nature",
    label: "- Nature",
    section: "stats",
    kind: "nature",
    nature: DEFENDER_NEGATIVE_NATURE,
  },
  ...buildExplicitNatureDefinitions("defender"),
  {
    scope: "defender",
    token: "reflect",
    label: "Reflect",
    section: "move_effects",
    kind: "side_effect",
    sideEffect: "reflect",
  },
  {
    scope: "defender",
    token: "light-screen",
    label: "Light Screen",
    section: "move_effects",
    kind: "side_effect",
    sideEffect: "light_screen",
  },
  {
    scope: "defender",
    token: "aurora-veil",
    label: "Aurora Veil",
    section: "move_effects",
    kind: "side_effect",
    sideEffect: "aurora_veil",
  },
  {
    scope: "defender",
    token: "protect",
    label: "Protect",
    section: "move_effects",
    kind: "side_effect",
    sideEffect: "protect",
  },
  {
    scope: "defender",
    token: "friend-guard",
    label: "Friend Guard",
    section: "move_effects",
    kind: "side_effect",
    sideEffect: "friend_guard",
  },
  {
    scope: "defender",
    token: "tailwind",
    label: "Tailwind",
    section: "move_effects",
    kind: "side_effect",
    sideEffect: "tailwind",
  },
];

const GLOBAL_MODIFIERS: ModifierDefinition[] = [
  {
    scope: "global",
    token: "rain",
    label: "Rain",
    section: "weather",
    kind: "global_effect",
    globalEffect: "rain",
  },
  {
    scope: "global",
    token: "sun",
    label: "Sun",
    section: "weather",
    kind: "global_effect",
    globalEffect: "sun",
  },
  {
    scope: "global",
    token: "sand",
    label: "Sand",
    section: "weather",
    kind: "global_effect",
    globalEffect: "sand",
  },
  {
    scope: "global",
    token: "snow",
    label: "Snow",
    section: "weather",
    kind: "global_effect",
    globalEffect: "snow",
  },
  {
    scope: "global",
    token: "electric-terrain",
    label: "Electric",
    section: "terrain",
    kind: "global_effect",
    globalEffect: "electric_terrain",
  },
  {
    scope: "global",
    token: "grassy-terrain",
    label: "Grassy",
    section: "terrain",
    kind: "global_effect",
    globalEffect: "grassy_terrain",
  },
  {
    scope: "global",
    token: "psychic-terrain",
    label: "Psychic",
    section: "terrain",
    kind: "global_effect",
    globalEffect: "psychic_terrain",
  },
  {
    scope: "global",
    token: "misty-terrain",
    label: "Misty",
    section: "terrain",
    kind: "global_effect",
    globalEffect: "misty_terrain",
  },
  {
    scope: "global",
    token: "trick-room",
    label: "Trick Room",
    section: "field_effects",
    kind: "global_effect",
    globalEffect: "trick_room",
  },
  {
    scope: "global",
    token: "gravity",
    label: "Gravity",
    section: "field_effects",
    kind: "global_effect",
    globalEffect: "gravity",
  },
];

export const ATTACKER_MODIFIER_MAP = new Map(
  ATTACKER_MODIFIERS.map((definition) => [definition.token, definition]),
);
export const DEFENDER_MODIFIER_MAP = new Map(
  DEFENDER_MODIFIERS.map((definition) => [definition.token, definition]),
);
export const GLOBAL_MODIFIER_MAP = new Map(
  GLOBAL_MODIFIERS.map((definition) => [definition.token, definition]),
);

export const ATTACKER_CHIP_DEFINITIONS = ATTACKER_MODIFIERS.filter(
  (definition) =>
    !(definition.kind === "nature" && definition.nature && definition.nature[0] !== "_"),
);
export const DEFENDER_CHIP_DEFINITIONS = DEFENDER_MODIFIERS.filter(
  (definition) =>
    !(definition.kind === "nature" && definition.nature && definition.nature[0] !== "_"),
);
export const GLOBAL_CHIP_DEFINITIONS = GLOBAL_MODIFIERS;

export function slugifySymbolValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['.:]/g, "")
    .replace(/[^a-z0-9+\-\s]+/g, "")
    .replace(/\s+/g, "-");
}

export function normalizeModifierValue(value: string) {
  const normalized = slugifySymbolValue(value);
  return MODIFIER_ALIASES.get(normalized) ?? normalized;
}

export function formatModifierToken(scope: ModifierScope, token: string) {
  if (scope === "global") {
    return `~${token}`;
  }

  return token;
}

export function formatAbilityToken(
  _scope: "attacker" | "defender",
  ability: string,
) {
  return `[${ability}]`;
}

export function parseAbilitySymbol(
  token: string,
  fallbackScope?: "attacker" | "defender",
) {
  const plainMatch = token.match(/^\[(.+)\]$/);

  if (!plainMatch || !fallbackScope) {
    return null;
  }

  return {
    scope: fallbackScope,
    ability: plainMatch[1].trim(),
  };
}

export function buildInitialChipState(): ActiveChipTokens {
  return {
    attacker: [],
    defender: [],
    global: [],
  };
}

export function buildCommonAbilities(
  profile: VgcMetaProfile | undefined,
  speciesAbilities: string[],
) {
  const abilities = [
    profile?.defaultAbility,
    ...(profile?.commonAbilities ?? []),
    ...speciesAbilities,
  ].filter(Boolean) as string[];

  return Array.from(new Set(abilities));
}
