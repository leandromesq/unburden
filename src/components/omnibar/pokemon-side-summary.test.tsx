import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { OmniComposer } from "@/components/omnibar/omni-composer";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

describe("PokemonSideSummary nature marker synchronization", () => {
  beforeEach(() => {
    useOmniStore.setState({
      input: "",
      cursorIndex: 0,
      strictMode: false,
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
    expect(summary).toHaveTextContent("Modest");
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

    expect(summary).toHaveTextContent("Modest (+SpA/-Atk)");
  });

  test("explicit prompt natures show on the identity card without custom SPs", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("politoed !muddy-water timid x incineroar calm");
    });

    expect(screen.getByTestId("attacker-summary")).toHaveTextContent(
      "Timid (+Spe/-Atk)",
    );
    expect(screen.getByTestId("defender-summary")).toHaveTextContent(
      "Calm (+SpD/-Atk)",
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
    expect(summary).toHaveTextContent("Calm");
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
    expect(summary).toHaveTextContent("Incineroar");
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
    expect(summary).toHaveTextContent("Adamant");
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
});
