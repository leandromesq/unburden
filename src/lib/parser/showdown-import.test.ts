import { parseShowdownSets } from "@/lib/parser/showdown-import";

describe("showdown import", () => {
  test("treats imported EV lines as Champions SPs and derives calc EVs from them", () => {
    const [set] = parseShowdownSets(`Politoed @ Mystic Water
Ability: Drizzle
Level: 50
EVs: 32 HP / 1 Def / 13 SpA / 1 SpD / 19 Spe
Modest Nature
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
      spa: 104,
      spd: 8,
      spe: 152,
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

  test("parses first-line gender markers without corrupting species", () => {
    const sets = parseShowdownSets(`Tinkaton (F) @ Metal Coat
Ability: Own Tempo
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Gigaton Hammer
- Feint
- Fake Out
- Helping Hand

Tauros-Paldea-Aqua (M) @ White Herb
Ability: Intimidate
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Protect
- Wave Crash
- Close Combat
- Aqua Jet`);

    expect(sets).toHaveLength(2);
    expect(sets[0].speciesId).toBe("tinkaton");
    expect(sets[0].gender).toBe("F");
    expect(sets[1].speciesId).toBe("taurospaldeaaqua");
    expect(sets[1].gender).toBe("M");
  });

  test("parses explicit Gender line when present", () => {
    const [set] = parseShowdownSets(`Meowscarada @ Focus Sash
Ability: Overgrow
Gender: F
Level: 50
EVs: 32 Atk / 32 Spe
Jolly Nature
- Flower Trick
- Knock Off
- U-turn
- Protect`);

    expect(set.speciesId).toBe("meowscarada");
    expect(set.gender).toBe("F");
  });

  test("parses nickname, tera type, IVs, aliases, fuzzy matches, and skips invalid sets", () => {
    const sets = parseShowdownSets(`Slowking Classic (Slowking) @ Leftovers
Ability: Regenerator
Level: 50
Tera Type: Poison
IVs: 31 HP / 0 Atk / 30 Def / 29 SpA / 28 SpD / 27 Spe
Calm Nature
- Scald
- Future Sight
- Slack Off
- Protect

Incin @ Safety Goggles
Ability: Intimidate
Level: 50
- Fake Out

Slowkingg @ Sitrus Berry
Ability: Regenerator
Level: 50
- Future Sight

NotAPokemon @ Leftovers
Ability: Pressure
- Protect`);

    expect(sets).toHaveLength(3);

    expect(sets[0]).toMatchObject({
      speciesId: "slowking",
      nickname: "Slowking Classic",
      teraType: "Poison",
      ivs: {
        hp: 31,
        atk: 0,
        def: 30,
        spa: 29,
        spd: 28,
        spe: 27,
      },
    });

    expect(sets[1].speciesId).toBe("incineroar");
    expect(sets[2].speciesId).toBe("slowkinggalar");
  });
});
