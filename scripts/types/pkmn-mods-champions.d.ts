declare module "@pkmn/mods/champions" {
	import type { ModData } from "@pkmn/dex";

	export const Abilities: NonNullable<ModData["Abilities"]>;
	export const Conditions: NonNullable<ModData["Conditions"]>;
	export const Formats: NonNullable<ModData["Formats"]>;
	export const FormatsData: NonNullable<ModData["FormatsData"]>;
	export const Items: NonNullable<ModData["Items"]>;
	export const Learnsets: NonNullable<ModData["Learnsets"]>;
	export const Moves: NonNullable<ModData["Moves"]>;
	export const Rulesets: NonNullable<ModData["Rulesets"]>;
	export const Scripts: NonNullable<ModData["Scripts"]>;
}
