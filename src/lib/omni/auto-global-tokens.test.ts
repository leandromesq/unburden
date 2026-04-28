import {
  applyAutoGlobalTokens,
  prioritizeRecommendedGlobals,
} from "@/lib/omni/auto-global-tokens";
import type {
  ImportedSet,
  SuggestionOption,
} from "@/lib/types";

const noSets: Record<string, ImportedSet> = {};

function getAutoTokens(input: string, importedSets = noSets) {
  return applyAutoGlobalTokens(
    input,
    importedSets,
    ["~snow"],
    "previous-context",
    "dismissed-context",
  );
}

describe("auto global tokens", () => {
  test("recommends weather from an explicit resolved ability", () => {
    const result = getAutoTokens(
      "politoed !muddy-water [Drizzle] x incineroar",
    );

    expect(result.input).toBe("politoed !muddy-water [Drizzle] x incineroar");
    expect(result.autoAppliedGlobalTokens).toEqual(["~rain"]);
    expect(result.autoGlobalContextKey).toBe(
      "politoed|drizzle|incineroar|intimidate",
    );
    expect(result.dismissedAutoGlobalContextKey).toBeNull();
  });

  test("uses the slower weather setter when both sides set conflicting weather", () => {
    const result = getAutoTokens("pelipper !muddy-water x torkoal");

    expect(result.autoAppliedGlobalTokens).toEqual(["~sun"]);
    expect(result.autoGlobalContextKey).toBe(
      "pelipper|drizzle|torkoal|drought",
    );
  });

  test("does not recommend automatic weather when the prompt has manual weather", () => {
    const result = getAutoTokens("pelipper !muddy-water x torkoal ~rain");

    expect(result.autoAppliedGlobalTokens).toEqual([]);
    expect(result.autoGlobalContextKey).toBe(
      "pelipper|drizzle|torkoal|drought",
    );
  });

  test("does not recommend tokens before both exact species and the move parse", () => {
    expect(getAutoTokens("pelipper").autoAppliedGlobalTokens).toEqual([]);
    expect(getAutoTokens("pelipper x torkoal").autoAppliedGlobalTokens).toEqual(
      [],
    );
  });

  test("does not recommend tokens for compact saved set references", () => {
    const importedSets: Record<string, ImportedSet> = {
      rain: {
        speciesId: "pelipper",
        speciesName: "Pelipper",
        item: "Focus Sash",
        ability: "Drizzle",
        level: 50,
        nature: "Modest",
        statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
        ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ["Muddy Water"],
      },
    };

    const result = getAutoTokens("#rain !muddy-water x torkoal", importedSets);

    expect(result.autoAppliedGlobalTokens).toEqual([]);
    expect(result.autoGlobalContextKey).toBeNull();
  });
});

describe("prioritizeRecommendedGlobals", () => {
  const rainOption: SuggestionOption = {
    type: "modifier",
    value: "~rain",
    label: "Rain",
    applyText: "pelipper !muddy-water x incineroar ~rain",
  };
  const sunOption: SuggestionOption = {
    type: "modifier",
    value: "~sun",
    label: "Sun",
    applyText: "pelipper !muddy-water x incineroar ~sun",
  };

  test("synthesizes recommendation options when there are no existing options", () => {
    expect(
      prioritizeRecommendedGlobals("pelipper !muddy-water x incineroar  ", [], [
        "~rain",
      ]),
    ).toEqual([
      {
        type: "modifier",
        value: "~rain",
        label: "~rain",
        applyText: "pelipper !muddy-water x incineroar ~rain",
      },
    ]);
  });

  test("puts missing and existing recommendations before other options", () => {
    expect(
      prioritizeRecommendedGlobals(
        "pelipper !muddy-water x incineroar",
        [sunOption, rainOption],
        ["~rain", "~electric-terrain"],
      ),
    ).toEqual([
      {
        type: "modifier",
        value: "~electric-terrain",
        label: "~electric-terrain",
        applyText:
          "pelipper !muddy-water x incineroar ~electric-terrain",
      },
      rainOption,
      sunOption,
    ]);
  });

  test("keeps options untouched when there are no recommendations", () => {
    expect(
      prioritizeRecommendedGlobals("pelipper !muddy-water x incineroar", [
        sunOption,
      ], []),
    ).toEqual([sunOption]);
  });
});
