import {
  itemDisplayById,
  legalPokemonData,
  pokemonById,
} from "@/lib/data/loaders";

describe("champions species data", () => {
  test("uses updated Champions mega abilities for newer megas", () => {
    expect(pokemonById.get("excadrillmega")?.abilities).toEqual([
      "Piercing Drill",
    ]);
    expect(pokemonById.get("golurkmega")?.abilities).toEqual([
      "Unseen Fist",
    ]);
    expect(pokemonById.get("floettemega")?.abilities).toEqual([
      "Fairy Aura",
    ]);
  });

  test("includes legal Regulation M-A base forms for mega-capable species", () => {
    const legalIds = new Set(legalPokemonData.map((pokemon) => pokemon.id));

    expect(pokemonById.get("aggron")?.name).toBe("Aggron");
    expect(pokemonById.get("alakazam")?.name).toBe("Alakazam");
    expect(legalIds.has("aggron")).toBe(true);
    expect(legalIds.has("alakazam")).toBe(true);
  });

  test("includes the full legal Champions item pool instead of only meta items", () => {
    expect(itemDisplayById.get("softsand")).toBe("Soft Sand");
    expect(itemDisplayById.get("occaberry")).toBe("Occa Berry");
    expect(itemDisplayById.has("potion")).toBe(false);
  });
});
