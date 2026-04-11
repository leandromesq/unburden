import { parseShowdownSets } from "@/lib/parser/showdown-import";

describe("showdown import", () => {
  test("converts imported EVs to Champions SPs while preserving calc EVs", () => {
    const [set] = parseShowdownSets(`Politoed @ Mystic Water
Ability: Drizzle
Level: 50
EVs: 252 HP / 8 Def / 100 SpA / 4 SpD / 148 Spe
Modest Nature
IVs: 0 Atk
- Muddy Water
- Ice Beam
- Protect
- Helping Hand`);

    expect(set.statPoints).toEqual({
      hp: 32,
      atk: 0,
      def: 1,
      spa: 13,
      spd: 1,
      spe: 19,
    });
    expect(set.evs).toEqual({
      hp: 252,
      atk: 0,
      def: 8,
      spa: 100,
      spd: 4,
      spe: 148,
    });
  });

  test("parses Champions SP lines directly", () => {
    const [set] = parseShowdownSets(`Incineroar @ Assault Vest
Ability: Intimidate
Level: 50
SPs: 32 HP / 8 Atk / 10 Def / 0 SpA / 8 SpD / 8 Spe
Careful Nature
- Flare Blitz
- Fake Out
- Knock Off
- Parting Shot`);

    expect(set.statPoints).toEqual({
      hp: 32,
      atk: 8,
      def: 10,
      spa: 0,
      spd: 8,
      spe: 8,
    });
    expect(set.evs.hp).toBe(252);
    expect(set.evs.def).toBe(80);
  });
});
