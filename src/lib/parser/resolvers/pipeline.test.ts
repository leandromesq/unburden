import { resolveAttackerSpeciesSuggestion } from "@/lib/parser/resolvers/attacker-species-resolver";
import { buildSuggestionContext } from "@/lib/parser/resolvers/context";
import { resolveGlobalModifierSuggestion } from "@/lib/parser/resolvers/global-modifier-resolver";
import {
  ACTIVE_TOKEN_RESOLVERS,
  SLOT_RESOLVERS,
  resolveSuggestionPipeline,
  runResolverPipeline,
} from "@/lib/parser/resolvers/pipeline";
import type { ImportedSet } from "@/lib/types";

const referencedSets: Record<string, ImportedSet> = {
  politoed: {
    speciesId: "politoed",
    speciesName: "Politoed",
    nickname: "rain-toed",
    item: "Mystic Water",
    ability: "Drizzle",
    level: 50,
    nature: "Modest",
    statPoints: { hp: 32, atk: 0, def: 1, spa: 13, spd: 1, spe: 19 },
    evs: { hp: 252, atk: 0, def: 8, spa: 104, spd: 8, spe: 152 },
    ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
  },
};

describe("resolver pipeline", () => {
  test("runResolverPipeline returns the first non-null result", () => {
    const context = buildSuggestionContext("politoed !muddy-water x incineroar");
    const first = jest.fn(() => null);
    const second = jest.fn(() => ({
      activeSuggestion: null,
      suggestionOptions: [],
    }));
    const third = jest.fn(() => ({
      activeSuggestion: null,
      suggestionOptions: [
        {
          type: "modifier" as const,
          value: "unexpected",
          label: "unexpected",
          applyText: "unexpected",
        },
      ],
    }));

    const result = runResolverPipeline(context, [first, second, third]);

    expect(result).toEqual({
      activeSuggestion: null,
      suggestionOptions: [],
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(third).not.toHaveBeenCalled();
  });

  test("active-token resolver pipeline continues explicit moves first", () => {
    const context = buildSuggestionContext("politoed !mud");

    const result = runResolverPipeline(context, ACTIVE_TOKEN_RESOLVERS);

    expect(result?.suggestionOptions[0]?.value).toBe("!muddy-water");
    expect(result?.activeSuggestion?.completionText).toBe("politoed !muddy-water");
  });

  test("slot resolver pipeline suggests the separator before defender suggestions", () => {
    const context = buildSuggestionContext("politoed !muddy-water ");

    const result = runResolverPipeline(context, SLOT_RESOLVERS);

    expect(result?.suggestionOptions[0]?.value).toBe("x");
    expect(result?.activeSuggestion?.completionText).toBe(
      "politoed !muddy-water x ",
    );
  });

  test("resolveSuggestionPipeline keeps the existing precedence for post-move whitespace", () => {
    const context = buildSuggestionContext("politoed !muddy-water ");

    const result = resolveSuggestionPipeline(context);

    expect(result.suggestionOptions[0]?.value).toBe("x");
  });
});

describe("resolver units", () => {
  test("attacker species resolver suggests saved set references directly", () => {
    const context = buildSuggestionContext("#rai", 4, referencedSets);

    const result = resolveAttackerSpeciesSuggestion(context);

    expect(result?.suggestionOptions[0]?.value).toBe("#raintoed");
    expect(result?.suggestionOptions[0]?.label).toContain("rain-toed");
  });

  test("global modifier resolver handles inline ~ fragments directly", () => {
    const context = buildSuggestionContext(
      "politoed !muddy-water x incineroar ~ra",
    );

    const result = resolveGlobalModifierSuggestion(context);

    expect(result?.suggestionOptions[0]?.value).toBe("~rain");
    expect(result?.activeSuggestion?.completionText).toContain("~rain");
  });
});
