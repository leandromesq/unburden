import {
  buildActiveChipTokens,
  insertChipToken,
  removeChipToken,
  setHpPercentageToken,
  setSpeedModifierToken,
  setStatModifierToken,
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
      ).toBe("politoed !muddy-water x incineroar %1");

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
});
