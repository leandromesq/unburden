import {
  buildActiveChipTokens,
  insertChipToken,
  removeChipToken,
  setAbilityToken,
  setNamedStageModifierToken,
  setNatureModifierToken,
  setHpPercentageToken,
  setItemToken,
  setSpeedModifierToken,
  setStatModifierToken,
  swapPromptSides,
  stripGlobalSectionTokens,
  toCanonicalScopeToken,
} from "@/lib/parser/input-mutations";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";

describe("input mutations", () => {
  describe("buildActiveChipTokens", () => {
    test("collects attacker, defender, and global chips from the parsed structure", () => {
      const structure = analyzeCommandStructure(
        "politoed !muddy-water +1 %75 [Drizzle] x incineroar reflect %50 [Intimidate] ~rain",
      );

      expect(buildActiveChipTokens(structure)).toEqual({
        attacker: ["+1", "%75", "[Drizzle]"],
        defender: ["reflect", "%50", "[Intimidate]"],
        global: ["~rain"],
      });
    });
  });

  describe("toCanonicalScopeToken", () => {
    test("normalizes attacker modifier aliases", () => {
      expect(toCanonicalScopeToken("attacker", "speed+2")).toBe("spe+2");
      expect(toCanonicalScopeToken("attacker", "positive-nature")).toBe(
        "+nature",
      );
    });

    test("normalizes global tokens with prefix", () => {
      expect(toCanonicalScopeToken("global", "~Rain")).toBe("~rain");
    });

    test("preserves hp tokens for side scopes", () => {
      expect(toCanonicalScopeToken("attacker", "%75")).toBe("%75");
      expect(toCanonicalScopeToken("defender", "%50")).toBe("%50");
    });

    test("normalizes ability tokens for side scopes", () => {
      expect(toCanonicalScopeToken("attacker", "[Drizzle]")).toBe("[Drizzle]");
      expect(toCanonicalScopeToken("defender", "[Intimidate]")).toBe(
        "[Intimidate]",
      );
    });

    test("rejects legacy scoped tokens", () => {
      expect(toCanonicalScopeToken("attacker", "a:+1")).toBeNull();
      expect(toCanonicalScopeToken("global", "g:rain")).toBeNull();
    });

    test("rejects unknown tokens", () => {
      expect(toCanonicalScopeToken("attacker", "not-a-real-token")).toBeNull();
    });
  });

  describe("removeChipToken", () => {
    test("removes attacker chips without affecting the rest of the prompt", () => {
      expect(
        removeChipToken(
          "politoed !muddy-water +1 %75 x incineroar reflect ~rain",
          "attacker",
          "+1",
        ),
      ).toBe("politoed !muddy-water %75 x incineroar reflect ~rain");
    });

    test("removes defender chips without affecting attacker tokens", () => {
      expect(
        removeChipToken(
          "politoed !muddy-water x incineroar reflect %50 ~rain",
          "defender",
          "reflect",
        ),
      ).toBe("politoed !muddy-water x incineroar %50 ~rain");
    });

    test("removes global chips from the full prompt", () => {
      expect(
        removeChipToken(
          "politoed !muddy-water x incineroar ~rain ~trick-room",
          "global",
          "~rain",
        ),
      ).toBe("politoed !muddy-water x incineroar ~trick-room");
    });
  });

  describe("stripGlobalSectionTokens", () => {
    test("removes only weather tokens when stripping weather", () => {
      expect(
        stripGlobalSectionTokens(
          "politoed !muddy-water x incineroar ~rain ~sun ~trick-room ~grassy-terrain",
          "weather",
        ),
      ).toBe("politoed !muddy-water x incineroar ~trick-room ~grassy-terrain");
    });

    test("removes only terrain tokens when stripping terrain", () => {
      expect(
        stripGlobalSectionTokens(
          "politoed !muddy-water x incineroar ~rain ~electric-terrain ~grassy-terrain ~gravity",
          "terrain",
        ),
      ).toBe("politoed !muddy-water x incineroar ~rain ~gravity");
    });
  });

  describe("insertChipToken", () => {
    test("appends attacker chips before the separator", () => {
      expect(
        insertChipToken("politoed !muddy-water x incineroar", "attacker", "+1"),
      ).toBe("politoed !muddy-water +1 x incineroar");
    });

    test("appends defender chips after the separator when defender exists", () => {
      expect(
        insertChipToken(
          "politoed !muddy-water x incineroar",
          "defender",
          "reflect",
        ),
      ).toBe("politoed !muddy-water x incineroar reflect");
    });

    test("does not append defender chips before the defender species is resolved", () => {
      expect(
        insertChipToken("politoed !muddy-water x", "defender", "reflect"),
      ).toBe("politoed !muddy-water x");
    });

    test("appends global chips at the end of the prompt", () => {
      expect(
        insertChipToken(
          "politoed !muddy-water x incineroar",
          "global",
          "~rain",
        ),
      ).toBe("politoed !muddy-water x incineroar ~rain");
    });

    test("toggles an existing chip off when inserting the same token again", () => {
      expect(
        insertChipToken(
          "politoed !muddy-water +1 x incineroar",
          "attacker",
          "+1",
        ),
      ).toBe("politoed !muddy-water x incineroar");
    });

    test("replaces existing weather when inserting a new weather token", () => {
      expect(
        insertChipToken(
          "politoed !muddy-water x incineroar ~rain ~trick-room",
          "global",
          "~sun",
        ),
      ).toBe("politoed !muddy-water x incineroar ~trick-room ~sun");
    });

    test("replaces existing terrain when inserting a new terrain token", () => {
      expect(
        insertChipToken(
          "politoed !muddy-water x incineroar ~electric-terrain ~gravity",
          "global",
          "~grassy-terrain",
        ),
      ).toBe("politoed !muddy-water x incineroar ~gravity ~grassy-terrain");
    });

    test("replaces existing side nature chips when selecting another nature modifier", () => {
      expect(
        insertChipToken(
          "gliscor !earthquake +nature x incineroar",
          "attacker",
          "-nature",
        ),
      ).toBe("gliscor !earthquake -nature x incineroar");
    });

    test("replaces existing investment chips on the same side", () => {
      expect(
        insertChipToken(
          "gliscor !earthquake max-atk x incineroar",
          "attacker",
          "max-spa",
        ),
      ).toBe("gliscor !earthquake max-spa x incineroar");
    });

    test("replaces existing ability chips on the same side", () => {
      expect(
        insertChipToken(
          "gliscor !earthquake [Hyper Cutter] x incineroar",
          "attacker",
          "[Poison Heal]",
        ),
      ).toBe("gliscor !earthquake [Poison Heal] x incineroar");
    });

    test("appends and toggles attacker chips directly after a saved set reference", () => {
      expect(
        insertChipToken("#gliscor x incineroar", "attacker", "max-atk"),
      ).toBe("#gliscor max-atk x incineroar");

      expect(
        insertChipToken("#gliscor max-atk x incineroar", "attacker", "max-atk"),
      ).toBe("#gliscor x incineroar");
    });
  });

  describe("setStatModifierToken", () => {
    test("sets attacker stat stage and replaces previous attacker stage", () => {
      expect(
        setStatModifierToken(
          "politoed !muddy-water +1 x incineroar",
          "attacker",
          3,
        ),
      ).toBe("politoed !muddy-water +3 x incineroar");
    });

    test("removes attacker stat stage when set to zero", () => {
      expect(
        setStatModifierToken(
          "politoed !muddy-water +1 x incineroar",
          "attacker",
          0,
        ),
      ).toBe("politoed !muddy-water x incineroar");
    });

    test("sets defender stat stage independently", () => {
      expect(
        setStatModifierToken(
          "politoed !muddy-water x incineroar reflect",
          "defender",
          2,
        ),
      ).toBe("politoed !muddy-water x incineroar reflect +2");
    });

    test("does not set defender stat stage when defender is unresolved", () => {
      expect(
        setStatModifierToken("politoed !muddy-water x", "defender", 2),
      ).toBe("politoed !muddy-water x");
    });
  });

  describe("setSpeedModifierToken", () => {
    test("sets attacker speed stage and replaces previous attacker speed stage", () => {
      expect(
        setSpeedModifierToken(
          "regieleki !electro-ball spe+1 x amoonguss",
          "attacker",
          4,
        ),
      ).toBe("regieleki !electro-ball spe+4 x amoonguss");
    });

    test("sets negative defender speed stage", () => {
      expect(
        setSpeedModifierToken(
          "regieleki !electro-ball x amoonguss",
          "defender",
          -2,
        ),
      ).toBe("regieleki !electro-ball x amoonguss spe-2");
    });

    test("removes speed stage when set to zero", () => {
      expect(
        setSpeedModifierToken(
          "regieleki !electro-ball spe+3 x amoonguss",
          "attacker",
          0,
        ),
      ).toBe("regieleki !electro-ball x amoonguss");
    });
  });

  describe("setNamedStageModifierToken", () => {
    test("sets an explicit named attacker stat stage and replaces the previous value for that stat", () => {
      expect(
        setNamedStageModifierToken(
          "archaludon !body-press def+1 spa+2 x incineroar",
          "attacker",
          "def",
          3,
        ),
      ).toBe("archaludon !body-press spa+2 def+3 x incineroar");
    });

    test("sets an explicit defender special defense stage", () => {
      expect(
        setNamedStageModifierToken(
          "politoed !muddy-water x incineroar reflect",
          "defender",
          "spd",
          -2,
        ),
      ).toBe("politoed !muddy-water x incineroar reflect spd-2");
    });

    test("delegates explicit speed stage updates to the speed token path", () => {
      expect(
        setNamedStageModifierToken(
          "regieleki !electro-ball spe+1 x amoonguss",
          "attacker",
          "spe",
          4,
        ),
      ).toBe("regieleki !electro-ball spe+4 x amoonguss");
    });
  });

  describe("setItemToken", () => {
    test("writes an item token for the current side and replaces the previous item", () => {
      expect(
        setItemToken(
          "politoed !muddy-water @leftovers x incineroar",
          "attacker",
          "Mystic Water",
        ),
      ).toBe("politoed !muddy-water @mystic-water x incineroar");
    });
  });

  describe("setAbilityToken", () => {
    test("writes an ability token for the current side and replaces the previous ability", () => {
      expect(
        setAbilityToken(
          "politoed !muddy-water [Water Absorb] x incineroar",
          "attacker",
          "Drizzle",
        ),
      ).toBe("politoed !muddy-water [Drizzle] x incineroar");
    });
  });

  describe("setNatureModifierToken", () => {
    test("maps defense-boosting attacker natures to +nature for body press", () => {
      expect(
        setNatureModifierToken(
          "zamazenta !body-press x incineroar",
          "attacker",
          "bodypress",
          "Physical",
          "Bold",
        ),
      ).toBe("zamazenta !body-press +nature x incineroar");
    });

    test("maps defender defensive natures by the active move category", () => {
      expect(
        setNatureModifierToken(
          "snorlax !body-slam x incineroar",
          "defender",
          "bodyslam",
          "Physical",
          "Bold",
        ),
      ).toBe("snorlax !body-slam x incineroar +nature");
    });
  });

  describe("setHpPercentageToken", () => {
    test("sets attacker hp percentage and replaces previous value", () => {
      expect(
        setHpPercentageToken(
          "politoed !muddy-water %75 x incineroar",
          "attacker",
          50,
        ),
      ).toBe("politoed !muddy-water %50 x incineroar");
    });

    test("sets defender hp percentage", () => {
      expect(
        setHpPercentageToken(
          "politoed !muddy-water x incineroar reflect",
          "defender",
          25,
        ),
      ).toBe("politoed !muddy-water x incineroar reflect %25");
    });

    test("removes hp percentage when value is null", () => {
      expect(
        setHpPercentageToken(
          "politoed !muddy-water %75 x incineroar",
          "attacker",
          null,
        ),
      ).toBe("politoed !muddy-water x incineroar");
    });

    test("clamps hp percentage to valid bounds", () => {
      expect(
        setHpPercentageToken(
          "politoed !muddy-water x incineroar",
          "defender",
          0,
        ),
      ).toBe("politoed !muddy-water x incineroar %0");

      expect(
        setHpPercentageToken(
          "politoed !muddy-water x incineroar",
          "defender",
          999,
        ),
      ).toBe("politoed !muddy-water x incineroar %100");
    });

    test("does not set defender hp when defender is unresolved", () => {
      expect(
        setHpPercentageToken("politoed !muddy-water x", "defender", 50),
      ).toBe("politoed !muddy-water x");
    });
  });

  describe("swapPromptSides", () => {
    test("swaps both sides while keeping globals at the end", () => {
      expect(
        swapPromptSides("politoed !muddy-water @mystic-water x incineroar reflect ~rain"),
      ).toBe("incineroar reflect x politoed @mystic-water ~rain");
    });

    test("uses the new attacker's referenced set move when swapping a compact defender set", () => {
      expect(
        swapPromptSides(
          "politoed !muddy-water x #incineroar ~rain",
          {
            incineroar: {
              speciesId: "incineroar",
              speciesName: "Incineroar",
              level: 50,
              nature: "Careful",
              statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
              evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
              ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
              moves: ["Fake Out", "Flare Blitz"],
            },
          },
        ),
      ).toBe("#incineroar !fake-out x politoed ~rain");
    });

    test("returns the input unchanged when there is no defender side yet", () => {
      expect(swapPromptSides("politoed !muddy-water")).toBe("politoed !muddy-water");
    });
  });
});
