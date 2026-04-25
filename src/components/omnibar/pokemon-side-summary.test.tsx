import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { OmniComposer } from "@/components/omnibar/omni-composer";
import { SUMMARY_NATURES } from "@/components/omnibar/pokemon-summary/shared";
import { pokemonById, vgcMetaByPokemonId } from "@/lib/data/loaders";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import { buildCommonAbilities } from "@/lib/parser/grammar";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

function readDisplayedSummaryStat(
  summary: HTMLElement,
  label: "Atk" | "Spe",
) {
  const statInput = within(summary).getByRole("spinbutton", {
    name: `${label} stage`,
  });
  return statInput.previousElementSibling?.firstElementChild?.textContent;
}

function saveGliscorSet(
  overrides: Partial<Parameters<typeof createImportedSet>[0]> = {},
) {
  useTeamStore.getState().saveSet(
    createImportedSet({
      speciesId: "gliscor",
      speciesName: "Gliscor",
      ability: "Poison Heal",
      item: "Toxic Orb",
      nature: "Jolly",
      statPoints: {
        hp: 32,
        atk: 2,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 32,
      },
      moves: ["Earthquake", "Protect", "Tailwind", "Facade"],
      ...overrides,
    }),
  );
}

describe("PokemonSideSummary nature marker synchronization", () => {
  beforeEach(() => {
    useOmniStore.setState({
      input: "",
      cursorIndex: 0,
      commandStructure: useOmniStore.getState().commandStructure,
      parsed: null,
      activeSuggestion: null,
      suggestionOptions: [],
      highlightedSuggestionIndex: -1,
      calculationReady: false,
      autoAppliedGlobalTokens: [],
      autoGlobalContextKey: null,
      dismissedAutoGlobalContextKey: null,
      activeChipTokens: {
        attacker: [],
        defender: [],
        global: [],
      },
      results: [],
      issues: [],
    });

    useTeamStore.setState({
      localSets: {},
      sharedSets: {},
      importedSets: {},
    });
  });

  test("changing the saved set nature updates the summary SP marker inputs", () => {
    useTeamStore.getState().saveSet(
      createImportedSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        ability: "Drizzle",
        item: "Mystic Water",
        nature: "Modest",
        statPoints: {
          hp: 0,
          atk: 0,
          def: 0,
          spa: 32,
          spd: 0,
          spe: 0,
        },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      }),
    );

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");

    expect(
      within(summary).getByRole("textbox", { name: "Atk SP" }),
    ).toHaveValue("0-");
    expect(
      within(summary).getByRole("textbox", { name: "SpA SP" }),
    ).toHaveValue("32+");
    expect(within(summary).getByRole("textbox", { name: "HP SP" })).toHaveValue(
      "0",
    );
  });

  test("typing paired markers updates the saved set nature through the summary", () => {
    useTeamStore.getState().saveSet(
      createImportedSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        ability: "Drizzle",
        item: "Mystic Water",
        nature: "Hardy",
        statPoints: {
          hp: 0,
          atk: 0,
          def: 0,
          spa: 32,
          spd: 0,
          spe: 0,
        },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      }),
    );

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const atkInput = within(summary).getByRole("textbox", { name: "Atk SP" });
    const spaInput = within(summary).getByRole("textbox", { name: "SpA SP" });

    fireEvent.focus(atkInput);
    fireEvent.change(atkInput, { target: { value: "0-" } });

    fireEvent.focus(spaInput);
    fireEvent.change(spaInput, { target: { value: "32+" } });

    expect(useTeamStore.getState().importedSets.politoed.nature).toBe("Modest");
    expect(within(summary).getByRole("combobox", { name: "Nature" })).toHaveValue(
      "Modest (+SpA/-Atk)",
    );
  });

  test("replacing zero with a new numeric value does not concatenate in the summary input", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const hpInput = within(summary).getByRole("textbox", { name: "HP SP" });

    fireEvent.focus(hpInput);
    fireEvent.change(hpInput, { target: { value: "32" } });

    expect(hpInput).toHaveValue("32");
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water sp:32/0/0/0/0/0 x incineroar",
    );
  });

  test("summary SP inputs support multi-digit edits without remounting", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const hpInput = within(summary).getByRole("textbox", { name: "HP SP" });

    fireEvent.focus(hpInput);
    fireEvent.change(hpInput, { target: { value: "3" } });
    fireEvent.change(hpInput, { target: { value: "32" } });

    expect(within(summary).getByRole("textbox", { name: "HP SP" })).toHaveValue(
      "32",
    );
  });

  test("typing paired markers updates the live nature for prompt-only summaries", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const atkInput = within(summary).getByRole("textbox", { name: "Atk SP" });
    const spaInput = within(summary).getByRole("textbox", { name: "SpA SP" });

    fireEvent.focus(atkInput);
    fireEvent.change(atkInput, { target: { value: "0-" } });

    fireEvent.focus(spaInput);
    fireEvent.change(spaInput, { target: { value: "32+" } });

    expect(within(summary).getByRole("combobox", { name: "Nature" })).toHaveValue(
      "Modest (+SpA/-Atk)",
    );
  });

  test("explicit prompt natures show on the identity card without custom SPs", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("politoed !muddy-water timid x incineroar calm");
    });

    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("combobox", {
        name: "Nature",
      }),
    ).toHaveValue("Timid (+Spe/-Atk)");
    expect(
      within(screen.getByTestId("defender-summary")).getByRole("combobox", {
        name: "Nature",
      }),
    ).toHaveValue("Calm (+SpD/-Atk)");
  });

  test("nature combobox shows the full fixed nature list in the summary", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const natureCombobox = within(summary).getByRole("combobox", {
      name: "Nature",
    });

    fireEvent.focus(natureCombobox);

    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(
      SUMMARY_NATURES.length,
    );
  });

  test("ability combobox shows all available abilities for the current pokemon", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const abilityCombobox = within(summary).getByRole("combobox", {
      name: "Ability",
    });
    const expectedAbilities = buildCommonAbilities(
      vgcMetaByPokemonId.get("politoed"),
      pokemonById.get("politoed")?.abilities ?? [],
    );

    fireEvent.focus(abilityCombobox);

    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(
      expectedAbilities.length,
    );
  });

  test("plain species prompts do not implicitly adopt a saved attacker set", () => {
    useTeamStore.getState().saveSet(
      createImportedSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        ability: "Drizzle",
        item: "Mystic Water",
        nature: "Bold",
        statPoints: {
          hp: 31,
          atk: 0,
          def: 20,
          spa: 0,
          spd: 15,
          spe: 0,
        },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      }),
    );

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");

    expect(summary).not.toHaveTextContent("Mystic Water");
    expect(within(summary).getByRole("textbox", { name: "HP SP" })).toHaveValue(
      "0",
    );
    expect(
      within(summary).getByRole("textbox", { name: "Def SP" }),
    ).toHaveValue("0");
  });

  test("plain species prompts do not implicitly adopt a saved defender set", () => {
    useTeamStore.getState().saveSet(
      createImportedSet({
        speciesId: "incineroar",
        speciesName: "Incineroar",
        ability: "Intimidate",
        item: "Safety Goggles",
        nature: "Careful",
        statPoints: {
          hp: 24,
          atk: 0,
          def: 10,
          spa: 0,
          spd: 32,
          spe: 0,
        },
        moves: ["Fake Out", "Flare Blitz", "Parting Shot", "Protect"],
      }),
    );

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("defender-summary");

    expect(summary).not.toHaveTextContent("Safety Goggles");
    expect(within(summary).getByRole("textbox", { name: "HP SP" })).toHaveValue(
      "0",
    );
    expect(
      within(summary).getByRole("textbox", { name: "SpD SP" }),
    ).toHaveValue("0");
  });

  test("prompt-only defender defense markers update the calc nature for physical moves", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("snorlax !body-slam x incineroar");
    });

    const startingMax = useOmniStore.getState().results[0]?.maxPercentage ?? 0;
    expect(useOmniStore.getState().parsed?.defenderNature).toBeUndefined();

    const summary = screen.getByTestId("defender-summary");
    const atkInput = within(summary).getByRole("textbox", { name: "Atk SP" });
    const defInput = within(summary).getByRole("textbox", { name: "Def SP" });

    fireEvent.focus(atkInput);
    fireEvent.change(atkInput, { target: { value: "0-" } });

    fireEvent.focus(defInput);
    fireEvent.change(defInput, { target: { value: "0+" } });

    expect(useOmniStore.getState().input).toContain("x incineroar +nature");
    expect(useOmniStore.getState().parsed?.defenderNature).toBe("Bold");
    expect(useOmniStore.getState().results[0]?.maxPercentage).toBeLessThan(
      startingMax,
    );
  });

  test("prompt-only attacker defense markers update body press calcs", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("archaludon !body-press x incineroar");
    });

    const startingMax = useOmniStore.getState().results[0]?.maxPercentage ?? 0;
    const summary = screen.getByTestId("attacker-summary");
    const atkInput = within(summary).getByRole("textbox", { name: "Atk SP" });
    const defInput = within(summary).getByRole("textbox", { name: "Def SP" });

    fireEvent.focus(atkInput);
    fireEvent.change(atkInput, { target: { value: "0-" } });

    fireEvent.focus(defInput);
    fireEvent.change(defInput, { target: { value: "0+" } });

    expect(useOmniStore.getState().input).toContain("!body-press +nature");
    expect(useOmniStore.getState().parsed?.attackerNature).toBe("Impish");
    expect(useOmniStore.getState().results[0]?.maxPercentage).toBeGreaterThan(
      startingMax,
    );
  });

  test("summary reflects updated saved set nature markers after recompute", () => {
    useTeamStore.getState().saveSet(
      createImportedSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        ability: "Drizzle",
        item: "Mystic Water",
        nature: "Hardy",
        statPoints: {
          hp: 0,
          atk: 0,
          def: 0,
          spa: 32,
          spd: 0,
          spe: 0,
        },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      }),
    );

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");

    act(() => {
      useTeamStore.getState().saveSet(
        createImportedSet({
          speciesId: "politoed",
          speciesName: "Politoed",
          ability: "Drizzle",
          item: "Mystic Water",
          nature: "Calm",
          statPoints: {
            hp: 0,
            atk: 0,
            def: 0,
            spa: 32,
            spd: 0,
            spe: 0,
          },
          moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
        }),
      );
      useOmniStore.getState().recompute();
    });

    expect(
      within(summary).getByRole("textbox", { name: "Atk SP" }),
    ).toHaveValue("0-");
    expect(
      within(summary).getByRole("textbox", { name: "SpD SP" }),
    ).toHaveValue("0+");
    expect(within(summary).getByRole("combobox", { name: "Nature" })).toHaveValue(
      "Calm (+SpD/-Atk)",
    );
  });

  test("clearing the prompt and switching to a new pokemon resets the summary SP spread", () => {
    useTeamStore.getState().saveSet(
      createImportedSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        ability: "Drizzle",
        item: "Mystic Water",
        nature: "Bold",
        statPoints: {
          hp: 31,
          atk: 0,
          def: 20,
          spa: 0,
          spd: 15,
          spe: 0,
        },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      }),
    );

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed x incineroar");
    });

    let summary = screen.getByTestId("attacker-summary");
    expect(within(summary).getByRole("textbox", { name: "HP SP" })).toHaveValue(
      "31",
    );

    act(() => {
      useOmniStore.getState().setInput("");
    });

    act(() => {
      useOmniStore.getState().setInput("incineroar x politoed");
    });

    summary = screen.getByTestId("attacker-summary");
    expect(
      within(summary).getByRole("combobox", { name: "Pokemon" }),
    ).toHaveValue("Incineroar");
    expect(within(summary).getByRole("textbox", { name: "HP SP" })).toHaveValue(
      "0",
    );
    expect(
      within(summary).getByRole("textbox", { name: "Def SP" }),
    ).toHaveValue("0");
  });

  test("clearing the prompt and switching to an imported set matches that set's SP spread", () => {
    useTeamStore.getState().saveSet(
      createImportedSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        ability: "Drizzle",
        item: "Mystic Water",
        nature: "Bold",
        statPoints: {
          hp: 31,
          atk: 0,
          def: 20,
          spa: 0,
          spd: 15,
          spe: 0,
        },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      }),
    );
    useTeamStore.getState().saveSet(
      createImportedSet({
        speciesId: "incineroar",
        speciesName: "Incineroar",
        ability: "Intimidate",
        item: "Safety Goggles",
        nature: "Adamant",
        statPoints: {
          hp: 12,
          atk: 20,
          def: 4,
          spa: 0,
          spd: 10,
          spe: 20,
        },
        moves: ["Fake Out", "Flare Blitz", "Parting Shot", "Protect"],
      }),
    );

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed x incineroar");
    });

    let summary = screen.getByTestId("attacker-summary");
    expect(within(summary).getByRole("textbox", { name: "HP SP" })).toHaveValue(
      "31",
    );

    act(() => {
      useOmniStore.getState().setInput("");
    });

    act(() => {
      useOmniStore.getState().setInput("#incineroar x politoed");
    });

    summary = screen.getByTestId("attacker-summary");
    expect(within(summary).getByRole("combobox", { name: "Nature" })).toHaveValue(
      "Adamant (+Atk/-SpA)",
    );
    expect(within(summary).getByRole("textbox", { name: "HP SP" })).toHaveValue(
      "12",
    );
    expect(
      within(summary).getByRole("textbox", { name: "Atk SP" }),
    ).toHaveValue("20+");
    expect(
      within(summary).getByRole("textbox", { name: "SpA SP" }),
    ).toHaveValue("0-");
  });

  test("attacker summary stage inputs rewrite named stat and speed tokens", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");

    fireEvent.change(
      within(summary).getByRole("spinbutton", { name: "SpA stage" }),
      { target: { value: "1" } },
    );
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water spa+1 x incineroar",
    );

    fireEvent.change(
      within(summary).getByRole("spinbutton", { name: "Spe stage" }),
      { target: { value: "-1" } },
    );
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water spa+1 spe-1 x incineroar",
    );
  });

  test("editing the relevant attacker stat replaces generic shorthand with an explicit stat token", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("archaludon !body-press +1 x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const defenseStageInput = within(summary).getByRole("spinbutton", {
      name: "Def stage",
    });

    fireEvent.change(defenseStageInput, { target: { value: "3" } });

    expect(useOmniStore.getState().input).toBe(
      "archaludon !body-press def+3 x incineroar",
    );
  });

  test("defender summary stage inputs support explicit defensive stats and speed", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("snorlax !body-slam x incineroar");
    });

    const summary = screen.getByTestId("defender-summary");

    fireEvent.change(
      within(summary).getByRole("spinbutton", { name: "Def stage" }),
      { target: { value: "1" } },
    );
    expect(useOmniStore.getState().input).toBe(
      "snorlax !body-slam x incineroar def+1",
    );

    fireEvent.change(
      within(summary).getByRole("spinbutton", { name: "Spe stage" }),
      { target: { value: "1" } },
    );
    expect(useOmniStore.getState().input).toBe(
      "snorlax !body-slam x incineroar def+1 spe+1",
    );
  });

  test("summary HP percent input rewrites the prompt hp token", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const hpPercentInput = within(summary).getByRole("spinbutton", {
      name: "HP %",
    });

    fireEvent.change(hpPercentInput, { target: { value: "75" } });
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water %75 x incineroar",
    );

    fireEvent.change(hpPercentInput, { target: { value: "100" } });
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water x incineroar",
    );
  });

  test("saved set summary fields keep updated ability and status selections", () => {
    useTeamStore.getState().saveSet(
      createImportedSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        ability: "Drizzle",
        item: "Mystic Water",
        nature: "Modest",
        statPoints: {
          hp: 0,
          atk: 0,
          def: 0,
          spa: 32,
          spd: 0,
          spe: 0,
        },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      }),
    );

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const abilityCombobox = within(summary).getByRole("combobox", {
      name: "Ability",
    });
    const statusCombobox = within(summary).getByRole("combobox", {
      name: "Status",
    });

    expect(abilityCombobox).toHaveValue("Drizzle");
    expect(statusCombobox).toHaveValue("Healthy");

    fireEvent.focus(abilityCombobox);
    fireEvent.change(abilityCombobox, { target: { value: "Damp" } });
    fireEvent.blur(abilityCombobox);

    expect(useTeamStore.getState().importedSets.politoed.ability).toBe("Damp");
    expect(abilityCombobox).toHaveValue("Damp");

    fireEvent.focus(statusCombobox);
    fireEvent.change(statusCombobox, { target: { value: "Burn" } });
    fireEvent.blur(statusCombobox);

    expect(useOmniStore.getState().input).toBe(
      "#politoed !muddy-water burn x incineroar",
    );
    expect(statusCombobox).toHaveValue("Burn");
  });

  test("saved set status selection updates through menu click interactions", () => {
    useTeamStore.getState().saveSet(
      createImportedSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        ability: "Drizzle",
        item: "Mystic Water",
        nature: "Modest",
        statPoints: {
          hp: 0,
          atk: 0,
          def: 0,
          spa: 32,
          spd: 0,
          spe: 0,
        },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      }),
    );

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const statusCombobox = within(summary).getByRole("combobox", {
      name: "Status",
    });
    const startingAtk = readDisplayedSummaryStat(summary, "Atk");

    fireEvent.focus(statusCombobox);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Burn" }));

    expect(useOmniStore.getState().input).toBe(
      "#politoed !muddy-water burn x incineroar",
    );
    expect(statusCombobox).toHaveValue("Burn");
    expect(readDisplayedSummaryStat(summary, "Atk")).not.toBe(startingAtk);
  });

  test("summary HP percent input accepts zero", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const hpPercentInput = within(summary).getByRole("spinbutton", {
      name: "HP %",
    });

    fireEvent.change(hpPercentInput, { target: { value: "0" } });

    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water %0 x incineroar",
    );
    expect(hpPercentInput).toHaveValue(0);
  });

  test("summary status field rewrites and clears prompt status tokens", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const statusCombobox = within(summary).getByRole("combobox", {
      name: "Status",
    });
    expect(statusCombobox).toHaveValue("Healthy");

    fireEvent.focus(statusCombobox);
    fireEvent.change(statusCombobox, { target: { value: "Burn" } });
    fireEvent.blur(statusCombobox);

    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water burn x incineroar",
    );
    expect(statusCombobox).toHaveValue("Burn");

    fireEvent.focus(statusCombobox);
    fireEvent.change(statusCombobox, { target: { value: "Healthy" } });
    fireEvent.blur(statusCombobox);

    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water x incineroar",
    );
    expect(statusCombobox).toHaveValue("Healthy");
  });

  test("summary status field updates displayed attack and speed values", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("incineroar !flare-blitz x politoed");
    });

    const summary = screen.getByTestId("attacker-summary");
    const statusCombobox = within(summary).getByRole("combobox", {
      name: "Status",
    });

    expect(readDisplayedSummaryStat(summary, "Atk")).toBe("115");
    expect(readDisplayedSummaryStat(summary, "Spe")).toBe("60");

    fireEvent.focus(statusCombobox);
    fireEvent.change(statusCombobox, { target: { value: "Burn" } });
    fireEvent.blur(statusCombobox);

    expect(readDisplayedSummaryStat(summary, "Atk")).toBe("57");
    expect(readDisplayedSummaryStat(summary, "Spe")).toBe("60");

    fireEvent.focus(statusCombobox);
    fireEvent.change(statusCombobox, { target: { value: "Para" } });
    fireEvent.blur(statusCombobox);

    expect(readDisplayedSummaryStat(summary, "Atk")).toBe("115");
    expect(readDisplayedSummaryStat(summary, "Spe")).toBe("30");
  });

  test("saved set status changes keep the rest of the summary populated", () => {
    saveGliscorSet();

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#gliscor !earthquake x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const pokemonCombobox = within(summary).getByRole("combobox", {
      name: "Pokemon",
    });
    const itemCombobox = within(summary).getByRole("combobox", {
      name: "Item",
    });
    const abilityCombobox = within(summary).getByRole("combobox", {
      name: "Ability",
    });
    const statusCombobox = within(summary).getByRole("combobox", {
      name: "Status",
    });
    const startingAtk = readDisplayedSummaryStat(summary, "Atk");

    fireEvent.focus(statusCombobox);
    fireEvent.change(statusCombobox, { target: { value: "Burn" } });
    fireEvent.blur(statusCombobox);

    expect(useOmniStore.getState().input).toBe(
      "#gliscor !earthquake burn x incineroar",
    );
    expect(pokemonCombobox).toHaveValue("Gliscor");
    expect(itemCombobox).toHaveValue("Toxic Orb");
    expect(abilityCombobox).toHaveValue("Poison Heal");
    expect(statusCombobox).toHaveValue("Burn");
    expect(readDisplayedSummaryStat(summary, "Atk")).not.toBe(startingAtk);
  });

  test("saved set without a nickname allows editing the set name", () => {
    saveGliscorSet({ nickname: undefined });

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#gliscor !earthquake x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const setNameInput = within(summary).getByRole("textbox", {
      name: "Set Name",
    });

    expect(setNameInput).toHaveValue("");

    fireEvent.change(setNameInput, { target: { value: "orb pivot" } });
    expect(setNameInput).toHaveValue("orb pivot");

    fireEvent.blur(setNameInput);

    expect(useTeamStore.getState().importedSets.gliscor.nickname).toBe(
      "orb pivot",
    );
  });

  test("summary shows the pokemon typing", () => {
    saveGliscorSet();

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#gliscor !earthquake x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");

    expect(within(summary).getByText("Ground")).toBeInTheDocument();
    expect(within(summary).getByText("Flying")).toBeInTheDocument();
  });
});
