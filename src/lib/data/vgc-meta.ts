import vgcMeta from "@/data/vgc-meta.json";
import type { VgcMetaProfile } from "@/lib/types";

const vgcMetaProfiles = vgcMeta as VgcMetaProfile[];

export const vgcMetaByPokemonId = new Map(
  vgcMetaProfiles.map((entry) => [entry.pokemonId, entry]),
);
