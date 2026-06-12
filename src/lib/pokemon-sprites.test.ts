jest.mock(
  "@pkmn/img",
  () => ({
    Sprites: {
      getPokemon: jest.fn((name: string, options: { gen: number }) => ({
        url: `https://img.example/${options.gen}/${name}.png`,
      })),
    },
  }),
  { virtual: true },
);

import { getPokemonSpriteSources } from "@/lib/pokemon-sprites";

describe("getPokemonSpriteSources", () => {
  test("prefers the static Showdown teambuilder-style Gen 5 sprite before animated fallbacks", () => {
    const sources = getPokemonSpriteSources({
      id: "incineroar",
      name: "Incineroar",
      aliases: [],
      types: ["Fire", "Dark"],
      abilities: [],
      baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 },
    });

    expect(sources).toEqual([
      "https://img.example/5/Incineroar.png",
      "https://img.example/9/Incineroar.png",
    ]);
  });
});
