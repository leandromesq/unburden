import { createImportedSet } from "@/lib/team/imported-set-utils";
import { formatImportedSetAsShowdown } from "@/lib/team/showdown-export";
import { parseShowdownSets } from "@/lib/parser/showdown-import";

describe("formatImportedSetAsShowdown", () => {
  test("serializes a saved set into a Showdown block the importer can round-trip", () => {
    const original = createImportedSet({
      speciesId: "politoed",
      speciesName: "Politoed",
      nickname: "rain-toed",
      gender: "F",
      item: "Mystic Water",
      ability: "Drizzle",
      level: 50,
      nature: "Modest",
      statPoints: {
        hp: 32,
        atk: 0,
        def: 1,
        spa: 13,
        spd: 1,
        spe: 19,
      },
      ivs: {
        hp: 31,
        atk: 0,
        def: 31,
        spa: 31,
        spd: 31,
        spe: 31,
      },
      moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      teraType: "Water",
    });

    const exported = formatImportedSetAsShowdown(original);
    const [parsed] = parseShowdownSets(exported);

    expect(exported).toContain("rain-toed (Politoed) (F) @ Mystic Water");
    expect(exported).toContain("Ability: Drizzle");
    expect(exported).toContain("EVs: 32 HP / 1 Def / 13 SpA / 1 SpD / 19 Spe");
    expect(exported).toContain("IVs: 0 Atk");
    expect(exported).toContain("- Helping Hand");
    expect(parsed).toMatchObject({
      speciesId: "politoed",
      nickname: "rain-toed",
      gender: "F",
      item: "Mystic Water",
      ability: "Drizzle",
      nature: "Modest",
      statPoints: original.statPoints,
      ivs: original.ivs,
      moves: original.moves,
      teraType: "Water",
    });
  });
});
