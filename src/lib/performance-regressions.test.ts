import { performance } from "node:perf_hooks";

import { calculateDamageResults } from "@/lib/calc/damage-engine";
import { parseCommand } from "@/lib/parser/command-parser";
import { getAutocompleteState } from "@/lib/parser/inline-suggestions";
import {
  buildSpeedTierGroups,
  resolveSpeedSide,
} from "@/lib/speed/speed-benchmark";
import { DEFAULT_SPEED_GLOBALS, parseSpeedCommand } from "@/lib/speed/speed-command";

function expectUnderBudget(label: string, maxDurationMs: number, operation: () => void) {
  const start = performance.now();

  operation();

  const duration = performance.now() - start;

  if (duration >= maxDurationMs) {
    throw new Error(
      `${label} took ${duration.toFixed(1)}ms, expected under ${maxDurationMs}ms`,
    );
  }
}

describe("performance regressions", () => {
  test("keeps repeated Calc Prompt parsing and autocomplete responsive", () => {
    const prompts = [
      "politoed !muddy-water @mystic-water x incineroar @assault-vest ~rain",
      "charizard !heat-wave single-target x tinkaton @occa-berry ~sun",
      "basculegion !last-respects[3] x incineroar reflect tailwind",
      "feraligatr-mega !body-slam @feraligite x incineroar",
    ];

    for (const prompt of prompts) {
      parseCommand(prompt);
      getAutocompleteState(prompt, prompt.length, {});
    }

    expectUnderBudget("200 parse/autocomplete iterations", 1500, () => {
      for (let index = 0; index < 200; index += 1) {
        const prompt = prompts[index % prompts.length];
        parseCommand(prompt);
        getAutocompleteState(prompt, prompt.length, {});
      }
    });
  });

  test("keeps repeated Damage Result calculations within an interactive budget", () => {
    const parsed = parseCommand(
      "politoed !muddy-water @mystic-water x incineroar @assault-vest ~rain",
    ).parsed;

    expect(parsed).not.toBeNull();
    calculateDamageResults(parsed!);

    expectUnderBudget("30 damage calculations", 5000, () => {
      for (let index = 0; index < 30; index += 1) {
        const results = calculateDamageResults(parsed!);
        expect(results.length).toBeGreaterThan(0);
      }
    });
  });

  test("keeps repeated Speed Ladder generation within an interactive budget", () => {
    const parsed = parseSpeedCommand("basculegion tailwind x aerodactyl +speed");
    const subjectMetrics = resolveSpeedSide(parsed.subject!, DEFAULT_SPEED_GLOBALS);

    expect(subjectMetrics).not.toBeNull();
    buildSpeedTierGroups(
      DEFAULT_SPEED_GLOBALS,
      subjectMetrics?.effectiveSpeed ?? null,
    );

    expectUnderBudget("50 Speed Ladder generations", 3000, () => {
      for (let index = 0; index < 50; index += 1) {
        const groups = buildSpeedTierGroups(
          DEFAULT_SPEED_GLOBALS,
          subjectMetrics?.effectiveSpeed ?? null,
        );
        expect(groups.length).toBeGreaterThan(0);
      }
    });
  });
});
