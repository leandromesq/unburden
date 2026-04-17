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
      "politoed !muddy-water sp:32/0/0/32/0/0 x incineroar",
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
