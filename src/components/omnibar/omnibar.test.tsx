import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRef } from "react";

import { ModifierSwitches } from "@/components/omnibar/modifier-switches";
import { OmniComposer } from "@/components/omnibar/omni-composer";
import { OmniTextarea } from "@/components/omnibar/omni-textarea";
import { SearchableCombobox } from "@/components/omnibar/searchable-combobox";
import { QuickSuggestions } from "@/components/omnibar/quick-suggestions";
import { ResultsPanel } from "@/components/omnibar/results-panel";
import { parseShareState } from "@/lib/share/parse-share-state";
import { resetOmniStore, useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

describe("omnibar components", () => {
  beforeEach(() => {
    resetOmniStore();
    useTeamStore.getState().clearSets();
    window.history.replaceState({}, "", "/");
  });

  test("Tab applies the active suggestion and keeps focus on the textarea", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<OmniTextarea textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput("poli");
    });

    const textarea = screen.getByTestId("omni-textarea");
    textareaRef.current?.focus();
    fireEvent.keyDown(textarea, { key: "Tab" });

    expect(useOmniStore.getState().input).toBe("politoed");
    expect(document.activeElement).toBe(textareaRef.current);
  });

  test("suggestion navigation advances the highlighted option", () => {
    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar ");
    });

    act(() => {
      useOmniStore.getState().moveSuggestionSelection(1);
    });

    expect(useOmniStore.getState().highlightedSuggestionIndex).toBe(1);
  });

  test("quick suggestion buttons apply canonical tokens", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(
      <>
        <textarea ref={textareaRef} />
        <QuickSuggestions textareaRef={textareaRef} />
      </>,
    );

    act(() => {
      useOmniStore.getState().setInput("politoed mud");
    });

    fireEvent.click(screen.getByRole("button", { name: /!muddy-water/i }));

    expect(useOmniStore.getState().input).toBe("politoed !muddy-water");
  });

  test("searchable combobox supports arrow-key navigation", () => {
    const handleChange = jest.fn();

    render(
      <SearchableCombobox
        label="Item"
        value=""
        options={["Mystic Water", "Sitrus Berry", "Assault Vest"]}
        onChange={handleChange}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Item" });

    fireEvent.focus(combobox);
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Enter" });

    expect(handleChange).toHaveBeenLastCalledWith("Sitrus Berry");
  });

  test("modifier chip toggles its token in the current input", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitches textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("incineroar !flare-blitz x tinkaton");
    });

    fireEvent.click(screen.getByRole("button", { name: /^Rain$/i }));
    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz x tinkaton ~rain",
    );

    fireEvent.click(screen.getByRole("button", { name: /^Rain$/i }));

    expect(useOmniStore.getState().input).toBe("incineroar !flare-blitz x tinkaton");
  });

  test("stage slider rewrites attacker and defender stages intuitively", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitches textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("incineroar !flare-blitz +2 x tinkaton -1");
    });

    fireEvent.change(screen.getByLabelText("attacker stage slider"), {
      target: { value: "4" },
    });
    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz +4 x tinkaton -1",
    );

    fireEvent.change(screen.getByLabelText("defender stage slider"), {
      target: { value: "0" },
    });
    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz +4 x tinkaton",
    );
  });

  test("speed slider rewrites attacker and defender speed stages independently", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitches textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("incineroar !flare-blitz spe+2 x tinkaton spe-1");
    });

    fireEvent.change(screen.getByLabelText("attacker speed slider"), {
      target: { value: "6" },
    });
    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz spe+6 x tinkaton spe-1",
    );

    fireEvent.change(screen.getByLabelText("defender speed slider"), {
      target: { value: "0" },
    });
    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz spe+6 x tinkaton",
    );
  });

  test("hp percentage chips set and replace attacker and defender current hp", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitches textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("incineroar !flare-blitz x tinkaton");
    });

    const hp25Buttons = screen.getAllByRole("button", { name: "25%" });
    const hp50Buttons = screen.getAllByRole("button", { name: "50%" });

    fireEvent.click(hp25Buttons[0]);
    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz %25 x tinkaton",
    );

    fireEvent.click(hp50Buttons[1]);
    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz %25 x tinkaton %50",
    );

    fireEvent.click(hp50Buttons[0]);
    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz %50 x tinkaton %50",
    );
  });

  test("results panel stays hidden until an explicit move is present", () => {
    render(<ResultsPanel />);

    act(() => {
      useOmniStore.getState().setInput("politoed x incineroar");
    });
    expect(screen.queryByTestId("results-panel")).not.toBeInTheDocument();

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });
    expect(screen.getByTestId("results-panel")).toBeInTheDocument();
  });

  test("strict mode blocks calculations that rely on inferred abilities", () => {
    render(<ResultsPanel />);

    act(() => {
      useOmniStore.getState().setStrictMode(true);
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    expect(useOmniStore.getState().calculationReady).toBe(false);
    expect(useOmniStore.getState().issues[0]).toContain("Strict mode:");
    expect(screen.queryByTestId("results-panel")).not.toBeInTheDocument();
  });

  test("results panel shows SP-style spreads instead of EV-style spreads", () => {
    render(<ResultsPanel />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    const resultsPanel = screen.getByTestId("results-panel");

    expect(resultsPanel).toHaveTextContent("Hardy | 1 HP");
    expect(resultsPanel).toHaveTextContent("32 SpA");
    expect(resultsPanel).not.toHaveTextContent("252 HP");
    expect(resultsPanel).not.toHaveTextContent("252 SpA");
  });

  test("copy button copies a share URL with the current prompt", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    window.history.replaceState({}, "", "/");

    render(<ResultsPanel />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /copy share url/i })[0]);
    });

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining(
        "prompt=politoed+%21muddy-water+x+incineroar",
      ),
    );
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("#result-glass"));
  });

  test("copy button includes relevant custom set state in the share URL", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    act(() => {
      useTeamStore.getState().saveSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        item: "Mystic Water",
        ability: "Drizzle",
        level: 50,
        nature: "Modest",
        statPoints: { hp: 32, atk: 0, def: 1, spa: 13, spd: 1, spe: 19 },
        evs: { hp: 252, atk: 0, def: 8, spa: 104, spd: 8, spe: 152 },
        ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      });
    });

    render(<ResultsPanel />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /copy share url/i })[0]);
    });

    const sharedUrl = writeText.mock.calls[0][0] as string;
    const parsedUrl = new URL(sharedUrl);
    const sets = parseShareState(parsedUrl.searchParams.get("state"));

    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({
      speciesId: "politoed",
      item: "Mystic Water",
      nature: "Modest",
      statPoints: { hp: 32, atk: 0, def: 1, spa: 13, spd: 1, spe: 19 },
    });
  });

  test("copy share url preserves strict mode", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<ResultsPanel />);

    act(() => {
      useOmniStore.getState().setStrictMode(true);
      useOmniStore
        .getState()
        .setInput("politoed !muddy-water [Drizzle] x incineroar [Intimidate]");
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /copy share url/i })[0]);
    });

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("strict=1"));
  });

  test("copy result text button copies the showdown-style result text", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<ResultsPanel />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /copy result text/i })[0]);
    });

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Politoed"),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("--"),
    );
  });

  test("Tab applies the highlighted suggestion even without inline ghost text", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<OmniTextarea textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar ");
    });

    const textarea = screen.getByTestId("omni-textarea");
    textareaRef.current?.focus();
    fireEvent.keyDown(textarea, { key: "Tab" });

    expect(document.activeElement).toBe(textareaRef.current);
    expect(useOmniStore.getState().input).toBe("politoed !muddy-water x incineroar ~rain");
  });

  test("Enter scrolls to the results when a calculation is ready", () => {
    const scrollIntoView = jest.fn();

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    fireEvent.keyDown(screen.getByTestId("omni-textarea"), { key: "Enter" });

    expect(scrollIntoView).toHaveBeenCalled();
  });

  test("hydrates the prompt from the shared URL", async () => {
    window.history.replaceState(
      {},
      "",
      "/?prompt=politoed%20!muddy-water%20x%20incineroar",
    );

    render(<OmniComposer />);

    await waitFor(() => {
      expect(useOmniStore.getState().input).toBe(
        "politoed !muddy-water x incineroar",
      );
    });
  });

  test("hydrates strict mode from the shared URL", async () => {
    window.history.replaceState(
      {},
      "",
      "/?prompt=politoed%20!muddy-water%20%5BDrizzle%5D%20x%20incineroar%20%5BIntimidate%5D&strict=1",
    );

    render(<OmniComposer />);

    await waitFor(() => {
      expect(useOmniStore.getState().strictMode).toBe(true);
    });
  });

  test("hydrates shared custom sets from the URL state", async () => {
    const encodedState = btoa(
      JSON.stringify({
        v: 1,
        sets: [
          {
            speciesId: "politoed",
            speciesName: "Politoed",
            item: "Mystic Water",
            ability: "Drizzle",
            level: 50,
            nature: "Modest",
            statPoints: { hp: 32, atk: 0, def: 1, spa: 13, spd: 1, spe: 19 },
            evs: { hp: 252, atk: 0, def: 8, spa: 104, spd: 8, spe: 152 },
            ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
            moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
          },
        ],
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    window.history.replaceState(
      {},
      "",
      `/?prompt=politoed%20!muddy-water%20x%20incineroar&state=${encodedState}`,
    );

    render(<OmniComposer />);

    await waitFor(() => {
      expect(useTeamStore.getState().importedSets.politoed).toMatchObject({
        item: "Mystic Water",
        nature: "Modest",
      });
    });
  });

  test("renders attacker and defender summaries next to the composer", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("Politoed");
    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("Muddy Water");
    expect(screen.getByTestId("defender-summary")).toHaveTextContent("Incineroar");
  });

  test("saved set cards insert canonical #set references into the prompt", () => {
    act(() => {
      useTeamStore.getState().saveSet({
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
      });
    });

    render(<OmniComposer />);

    fireEvent.click(
      within(screen.getByTestId("attacker-summary")).getByRole("button", {
        name: /rain-toed/i,
      }),
    );

    expect(useOmniStore.getState().input).toBe("#raintoed");
  });

  test("renders an explicit defender item in the defender summary", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("charizard !heat-wave x tinkaton @occa-berry");
    });

    expect(screen.getByTestId("defender-summary")).toHaveTextContent("Occa Berry");
  });

  test("editing a summary set stores SPs and updates the summary card", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    fireEvent.click(
      within(screen.getByTestId("attacker-summary")).getByRole("button", {
        name: "Edit",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: /edit politoed set/i });
    const itemCombobox = within(dialog).getByRole("combobox", { name: "Item" });
    fireEvent.focus(itemCombobox);
    fireEvent.change(itemCombobox, { target: { value: "myst" } });
    fireEvent.keyDown(itemCombobox, { key: "ArrowDown" });
    fireEvent.keyDown(itemCombobox, { key: "Enter" });
    fireEvent.change(within(dialog).getByLabelText("HP"), {
      target: { value: "32" },
    });
    fireEvent.change(within(dialog).getByLabelText("SpA"), {
      target: { value: "13" },
    });
    fireEvent.change(within(dialog).getByLabelText("Spe"), {
      target: { value: "19" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(useTeamStore.getState().importedSets.politoed.statPoints).toMatchObject({
      hp: 32,
      spa: 13,
      spe: 19,
    });
    expect(useTeamStore.getState().importedSets.politoed.item).toBe("Mystic Water");

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("32");
    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("HP");
    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("13");
    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("SpA");
  });

  test("editing an SP bubble inline writes a prompt sp: override", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    fireEvent.click(
      within(screen.getByTestId("attacker-summary")).getByRole("button", {
        name: "Edit HP SP",
      }),
    );

    const hpInput = within(screen.getByTestId("attacker-summary")).getByRole("textbox", {
      name: "HP SP",
    });
    fireEvent.change(hpInput, { target: { value: "32" } });
    fireEvent.keyDown(hpInput, { key: "Enter" });

    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water sp:32/0/0/0/0/0 x incineroar",
    );
    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("32");
    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("HP");
  });

  test("editing a summary set can change the pokemon species", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    fireEvent.click(
      within(screen.getByTestId("attacker-summary")).getByRole("button", {
        name: "Edit",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: /edit politoed set/i });
    const speciesCombobox = within(dialog).getByRole("combobox", { name: "Pokemon" });
    fireEvent.focus(speciesCombobox);
    fireEvent.change(speciesCombobox, { target: { value: "incin" } });
    fireEvent.keyDown(speciesCombobox, { key: "ArrowDown" });
    fireEvent.keyDown(speciesCombobox, { key: "Enter" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(useTeamStore.getState().importedSets.incineroar).toBeDefined();
    expect(useTeamStore.getState().importedSets.politoed).toBeUndefined();
    expect(useOmniStore.getState().input).toBe("incineroar !muddy-water x incineroar");
  });

  test("summary exposes a mega switch when the held item is a mega stone", () => {
    act(() => {
      useTeamStore.getState().saveSet({
        speciesId: "charizard",
        speciesName: "Charizard",
        level: 50,
        nature: "Modest",
        statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ["Heat Wave"],
        item: "Charizardite Y",
        ability: "Blaze",
      });
    });

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#charizard !heat-wave x tinkaton");
    });

    fireEvent.click(
      within(screen.getByTestId("attacker-summary")).getByRole("button", {
        name: /switch to mega form/i,
      }),
    );

    expect(useOmniStore.getState().input).toBe("charizard-mega-y !heat-wave x tinkaton");
  });

  test("does not auto-add weather before the defender side is resolved", () => {
    act(() => {
      useOmniStore.getState().setInput("poli");
    });

    expect(useOmniStore.getState().input).toBe("poli");
  });

  test("does not auto-add weather for a partial defender token", () => {
    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x c");
    });

    expect(useOmniStore.getState().input).toBe("politoed !muddy-water x c");
  });

  test("preserves a typed trailing space while the prompt is still incomplete", () => {
    act(() => {
      useOmniStore.getState().setInput("poli ");
    });

    expect(useOmniStore.getState().input).toBe("poli ");
  });

  test("surfaces weather from a resolved weather-setting ability as an opt-in suggestion", () => {
    act(() => {
      useOmniStore.getState().setInput("torkoal !heat-wave x tinkaton");
    });

    expect(useOmniStore.getState().input).toBe("torkoal !heat-wave x tinkaton");
    expect(useOmniStore.getState().suggestionOptions[0]?.value).toBe("~sun");
  });

  test("preserves a trailing space after a resolved field setter prompt", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<OmniTextarea textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("politoed !muddy-water x incineroar");
    });

    const textarea = screen.getByTestId("omni-textarea");
    fireEvent.change(textarea, {
      target: { value: "politoed !muddy-water x incineroar ", selectionStart: 35 },
      currentTarget: { value: "politoed !muddy-water x incineroar ", selectionStart: 35 },
    });

    expect(useOmniStore.getState().input).toBe("politoed !muddy-water x incineroar ");
  });

  test("surfaces rain from another resolved weather-setting ability as an opt-in suggestion", () => {
    act(() => {
      useOmniStore.getState().setInput("pelipper !hurricane x tinkaton");
    });

    expect(useOmniStore.getState().input).toBe("pelipper !hurricane x tinkaton");
    expect(useOmniStore.getState().suggestionOptions[0]?.value).toBe("~rain");
  });

  test("does not treat a mega stone alone as a mega weather setter", () => {
    act(() => {
      useOmniStore.getState().setInput("charizard !heat-wave @charizardite-y x tinkaton");
    });

    expect(useOmniStore.getState().input).toBe(
      "charizard !heat-wave @charizardite-y x tinkaton",
    );
    expect(useOmniStore.getState().suggestionOptions[0]?.value).not.toBe("~sun");
  });

  test("surfaces weather for an explicit mega form as an opt-in suggestion", () => {
    act(() => {
      useOmniStore.getState().setInput("charizard-mega-y !heat-wave @charizardite-y x tinkaton");
    });

    expect(useOmniStore.getState().suggestionOptions[0]?.value).toBe("~sun");
  });

  test("updates the recommended field suggestion when the prompt changes", () => {
    act(() => {
      useOmniStore.getState().setInput("torkoal !heat-wave x tinkaton");
    });
    expect(useOmniStore.getState().suggestionOptions[0]?.value).toBe("~sun");

    act(() => {
      useOmniStore.getState().setInput("incineroar !flare-blitz x tinkaton");
    });
    expect(useOmniStore.getState().input).toBe("incineroar !flare-blitz x tinkaton");
    expect(useOmniStore.getState().suggestionOptions[0]?.value).not.toBe("~sun");
  });

  test("lets the user opt in to the suggested global token with Tab", () => {
    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x tinkaton");
    });
    expect(useOmniStore.getState().input).toBe("politoed !muddy-water x tinkaton");
    expect(useOmniStore.getState().suggestionOptions[0]?.value).toBe("~rain");

    act(() => {
      useOmniStore.getState().applySuggestion();
    });
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water x tinkaton ~rain",
    );
  });

  test("prefers the slower pokemon when weather setters conflict", () => {
    act(() => {
      useOmniStore.getState().setInput("pelipper !hurricane x torkoal");
    });

    expect(useOmniStore.getState().input).toBe("pelipper !hurricane x torkoal");
    expect(useOmniStore.getState().suggestionOptions[0]?.value).toBe("~sun");
  });

  test("typing [ auto-closes brackets and keeps the caret inside", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<OmniTextarea textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput("incineroar !flare-blitz x tinkaton ");
    });

    const textarea = screen.getByTestId("omni-textarea");
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(
      textareaRef.current.value.length,
      textareaRef.current.value.length,
    );

    fireEvent.keyDown(textarea, { key: "[" });

    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz x tinkaton []",
    );
    expect(textareaRef.current?.selectionStart).toBe(
      "incineroar !flare-blitz x tinkaton [".length,
    );
    expect(textareaRef.current?.selectionEnd).toBe(
      "incineroar !flare-blitz x tinkaton [".length,
    );
  });
});
