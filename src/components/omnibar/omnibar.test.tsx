import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  createRef,
  type ComponentType,
  type RefObject,
} from "react";

import { ModifierSwitches } from "@/components/omnibar/modifier-switches";
import { OmniComposer } from "@/components/omnibar/omni-composer";
import { OmniTextarea } from "@/components/omnibar/omni-textarea";
import { SearchableCombobox } from "@/components/omnibar/searchable-combobox";
import { QuickSuggestions } from "@/components/omnibar/quick-suggestions";
import { ResultsPanel } from "@/components/omnibar/results-panel";
import { calculateDamageResults } from "@/lib/calc/damage-engine";
import { parseCommand } from "@/lib/parser/command-parser";
import { parseShareState } from "@/lib/share/parse-share-state";
import { resetOmniStore, useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

const ModifierSwitchesWithRef = ModifierSwitches as ComponentType<{
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}>;
const OmniTextareaWithRef = OmniTextarea as ComponentType<{
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}>;

describe("omnibar components", () => {
  beforeEach(() => {
    resetOmniStore();
    useTeamStore.getState().clearSets();
    window.history.replaceState({}, "", "/");
  });

  test("composer focuses the main textarea on initial load", async () => {
    render(<OmniComposer />);

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId("omni-textarea"));
    });
  });

  test("modifier switches stay collapsed until the modifiers button is pressed", () => {
    render(<OmniComposer />);

    expect(
      screen.queryByRole("button", { name: /^Rain$/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Toggle modifiers panel" }),
    );

    expect(screen.getByRole("button", { name: /^Rain$/i })).toBeInTheDocument();
  });

  test("swap sides button is disabled until the defender side exists", () => {
    render(<OmniComposer />);

    expect(
      screen.getByRole("button", { name: "Swap attacker and defender" }),
    ).toBeDisabled();

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    expect(
      screen.getByRole("button", { name: "Swap attacker and defender" }),
    ).toBeEnabled();
  });

  test("swap sides flips the prompt and both summaries", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Swap attacker and defender" }),
    );

    expect(useOmniStore.getState().input).toBe("incineroar x politoed");
    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("combobox", {
        name: "Pokemon",
      }),
    ).toHaveValue("Incineroar");
    expect(
      within(screen.getByTestId("defender-summary")).getByRole("combobox", {
        name: "Pokemon",
      }),
    ).toHaveValue("Politoed");
  });

  test("swap sides uses the defender set move when the new attacker is a compact #set", () => {
    act(() => {
      useTeamStore.getState().saveSet({
        speciesId: "incineroar",
        speciesName: "Incineroar",
        level: 50,
        nature: "Careful",
        statPoints: { hp: 32, atk: 0, def: 8, spa: 0, spd: 16, spe: 10 },
        evs: { hp: 252, atk: 0, def: 108, spa: 0, spd: 148, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ["Fake Out", "Flare Blitz", "Knock Off", "Parting Shot"],
      });
    });

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x #incineroar");
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Swap attacker and defender" }),
    );

    expect(useOmniStore.getState().input).toBe("#incineroar !fake-out x politoed");
  });

  test("Tab applies the active suggestion and keeps focus on the textarea", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<OmniTextareaWithRef textareaRef={textareaRef} />);

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

  test("searchable combobox keeps arrow navigation working after typing an exact-match draft value", () => {
    const handleInputChange = jest.fn();
    const handleSelectOption = jest.fn();

    render(
      <SearchableCombobox
        label="Item"
        value=""
        options={["my", "Mystic Water", "Sitrus Berry"]}
        onChange={() => {}}
        onInputChange={handleInputChange}
        onSelectOption={handleSelectOption}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Item" });

    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: "my" } });
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Enter" });

    expect(handleInputChange).toHaveBeenCalledWith("my");
    expect(handleSelectOption).toHaveBeenLastCalledWith("Mystic Water");
  });

  test("searchable combobox selects the highlighted option on Tab", () => {
    const handleSelectOption = jest.fn();

    render(
      <SearchableCombobox
        label="Nature"
        value=""
        options={["Hardy", "Modest", "Timid"]}
        onChange={() => {}}
        onSelectOption={handleSelectOption}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Nature" });

    fireEvent.focus(combobox);
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Tab" });

    expect(handleSelectOption).toHaveBeenLastCalledWith("Modest");
  });

  test("searchable combobox blurs after selecting an option", () => {
    render(
      <SearchableCombobox
        label="Nature"
        value=""
        options={["Hardy", "Modest", "Timid"]}
        onChange={() => {}}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Nature" });

    act(() => {
      combobox.focus();
    });
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Enter" });

    expect(combobox).not.toHaveFocus();
  });

  test("Alt+X swaps sides from the main textarea", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    fireEvent.keyDown(screen.getByTestId("omni-textarea"), {
      key: "x",
      altKey: true,
    });

    expect(useOmniStore.getState().input).toBe("incineroar x politoed");
  });

  test("modifier chip toggles its token in the current input", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitchesWithRef textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput("incineroar !flare-blitz x tinkaton");
    });

    fireEvent.click(screen.getByRole("button", { name: /^Rain$/i }));
    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz x tinkaton ~rain",
    );

    fireEvent.click(screen.getByRole("button", { name: /^Rain$/i }));

    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz x tinkaton",
    );
  });

  test("stage slider rewrites attacker and defender stages intuitively", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitchesWithRef textareaRef={textareaRef} />);

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

    render(<ModifierSwitchesWithRef textareaRef={textareaRef} />);

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

    render(<ModifierSwitchesWithRef textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput("incineroar !flare-blitz x tinkaton");
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

  test("results panel survives stale results when the latest parsed command has fewer archetypes", () => {
    act(() => {
      useTeamStore.getState().saveSet({
        speciesId: "incineroar",
        speciesName: "Incineroar",
        item: "Leftovers",
        ability: "Intimidate",
        level: 50,
        nature: "Careful",
        statPoints: { hp: 32, atk: 0, def: 8, spa: 0, spd: 16, spe: 10 },
        evs: { hp: 252, atk: 0, def: 108, spa: 0, spd: 148, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ["Flare Blitz", "Knock Off", "Parting Shot", "Fake Out"],
      });

      const importedSets = useTeamStore.getState().importedSets;
      const previousParsed = parseCommand(
        "politoed !muddy-water x incineroar",
        importedSets,
      ).parsed;
      const nextParsed = parseCommand(
        "politoed !muddy-water x #incineroar",
        importedSets,
      ).parsed;

      useOmniStore.setState((state) => ({
        ...state,
        parsed: nextParsed,
        results: calculateDamageResults(previousParsed!, importedSets),
      }));
    });

    render(<ResultsPanel />);

    const resultsPanel = screen.getByTestId("results-panel");

    expect(resultsPanel).toBeInTheDocument();
    expect(resultsPanel).toHaveTextContent("Hardy | 1 HP");
    expect(resultsPanel).toHaveTextContent("Hardy | 32 HP");
    expect(resultsPanel).toHaveTextContent("Calm | 32 HP");
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
      fireEvent.click(
        screen.getAllByRole("button", { name: /copy share url/i })[0],
      );
    });

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("prompt=politoed+%21muddy-water+x+incineroar"),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("#result-glass"),
    );
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
      fireEvent.click(
        screen.getAllByRole("button", { name: /copy share url/i })[0],
      );
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
      fireEvent.click(
        screen.getAllByRole("button", { name: /copy result text/i })[0],
      );
    });

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Politoed"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("--"));
  });

  test("Tab applies the highlighted suggestion even without inline ghost text", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<OmniTextareaWithRef textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar ");
    });

    const textarea = screen.getByTestId("omni-textarea");
    textareaRef.current?.focus();
    fireEvent.keyDown(textarea, { key: "Tab" });

    expect(document.activeElement).toBe(textareaRef.current);
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water x incineroar ~rain",
    );
  });

  test("clear prompt button resets the main textarea input", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear prompt" }));

    expect(useOmniStore.getState().input).toBe("");
    expect(screen.getByTestId("omni-textarea")).toHaveValue("");
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

    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("combobox", {
        name: "Pokemon",
      }),
    ).toHaveValue("Politoed");
    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("combobox", {
        name: "Move 1",
      }),
    ).toHaveValue("Muddy Water");
    expect(
      within(screen.getByTestId("attacker-summary")).getAllByRole("img", {
        name: "Water type",
      }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(screen.getByTestId("defender-summary")).getByRole("combobox", {
        name: "Pokemon",
      }),
    ).toHaveValue("Incineroar");
  });

  test("empty attacker summary can start the prompt from the species field", () => {
    render(<OmniComposer />);

    const attackerSummary = screen.getByTestId("attacker-summary");
    const speciesCombobox = within(attackerSummary).getByRole("combobox", {
      name: "Pokemon",
    });

    fireEvent.focus(speciesCombobox);
    fireEvent.change(speciesCombobox, { target: { value: "Politoed" } });
    fireEvent.blur(speciesCombobox);

    expect(useOmniStore.getState().input).toBe("politoed");
  });

  test("empty defender summary inserts the delimiter when starting from the species field", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed");
    });

    const defenderSummary = screen.getByTestId("defender-summary");
    const speciesCombobox = within(defenderSummary).getByRole("combobox", {
      name: "Pokemon",
    });

    fireEvent.focus(speciesCombobox);
    fireEvent.change(speciesCombobox, { target: { value: "Incineroar" } });
    fireEvent.blur(speciesCombobox);

    expect(useOmniStore.getState().input).toBe("politoed x incineroar");
  });

  test("renders move type icons in the attacker summary", () => {
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

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    expect(
      within(screen.getByTestId("attacker-summary")).getAllByRole("img", {
        name: "Water type",
      }).length,
    ).toBeGreaterThanOrEqual(1);
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

    expect(
      within(screen.getByTestId("defender-summary")).getByRole("combobox", {
        name: "Item",
      }),
    ).toHaveValue("Occa Berry");
  });

  test("editing a summary set stores SPs and updates the summary card", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const itemCombobox = within(summary).getByRole("combobox", { name: "Item" });
    fireEvent.focus(itemCombobox);
    fireEvent.change(itemCombobox, { target: { value: "Mystic Water" } });
    fireEvent.blur(itemCombobox);
    fireEvent.change(within(summary).getByRole("textbox", { name: "HP SP" }), {
      target: { value: "32" },
    });
    fireEvent.change(within(summary).getByRole("textbox", { name: "SpA SP" }), {
      target: { value: "13" },
    });
    fireEvent.change(within(summary).getByRole("textbox", { name: "Spe SP" }), {
      target: { value: "19" },
    });
    fireEvent.click(within(summary).getByRole("button", { name: "Save" }));

    expect(
      useTeamStore.getState().importedSets.politoed.statPoints,
    ).toMatchObject({
      hp: 32,
      spa: 13,
      spe: 19,
    });
    expect(useTeamStore.getState().importedSets.politoed.item).toBe(
      "Mystic Water",
    );
    expect(useOmniStore.getState().input).toBe("#politoed !muddy-water x incineroar");
    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("button", {
        name: /remove politoed set/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("textbox", {
        name: "HP SP",
      }),
    ).toHaveValue("32");
    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("HP");
    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("textbox", {
        name: "SpA SP",
      }),
    ).toHaveValue("13");
    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("combobox", {
        name: "Item",
      }),
    ).toHaveValue("Mystic Water");
  });

  test("editing an SP bubble inline writes a prompt sp: override", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const hpInput = within(screen.getByTestId("attacker-summary")).getByRole(
      "textbox",
      {
        name: "HP SP",
      },
    );
    fireEvent.change(hpInput, { target: { value: "32" } });
    fireEvent.keyDown(hpInput, { key: "Enter" });

    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water sp:32/0/0/0/0/0 x incineroar",
    );
    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("textbox", {
        name: "HP SP",
      }),
    ).toHaveValue("32");
    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("HP");
  });

  test("editing a summary set can change the pokemon species", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const speciesCombobox = within(summary).getByRole("combobox", {
      name: "Pokemon",
    });
    fireEvent.focus(speciesCombobox);
    fireEvent.change(speciesCombobox, { target: { value: "Incineroar" } });
    fireEvent.blur(speciesCombobox);
    fireEvent.click(within(summary).getByRole("button", { name: "Save" }));

    expect(useTeamStore.getState().importedSets.incineroar).toBeDefined();
    expect(useTeamStore.getState().importedSets.politoed).toBeUndefined();
    expect(useOmniStore.getState().input).toBe("#incineroar !muddy-water x incineroar");
  });

  test("saving a named inline summary compacts the prompt to the new #set token", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const nicknameInput = within(summary).getByRole("textbox", {
      name: "Set Name",
    });

    fireEvent.change(nicknameInput, { target: { value: "rain-toed" } });
    fireEvent.click(within(summary).getByRole("button", { name: "Save" }));

    expect(useTeamStore.getState().importedSets.politoed.nickname).toBe(
      "rain-toed",
    );
    expect(useOmniStore.getState().input).toBe(
      "#raintoed !muddy-water x incineroar",
    );
  });

  test("saving an inline-edited summary promotes it to saved-set UI", () => {
    act(() => {
      useTeamStore.getState().saveSet({
        speciesId: "incineroar",
        speciesName: "Incineroar",
        level: 50,
        nature: "Careful",
        statPoints: { hp: 32, atk: 0, def: 8, spa: 0, spd: 16, spe: 10 },
        evs: { hp: 252, atk: 0, def: 108, spa: 0, spd: 148, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ["Fake Out", "Flare Blitz", "Knock Off", "Parting Shot"],
      });
    });

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    fireEvent.change(
      within(screen.getByTestId("attacker-summary")).getByRole("textbox", {
        name: "HP SP",
      }),
      {
        target: { value: "32" },
      },
    );
    fireEvent.click(
      within(screen.getByTestId("attacker-summary")).getByRole("button", {
        name: "Save",
      }),
    );

    expect(useTeamStore.getState().importedSets.politoed).toBeDefined();
    expect(useOmniStore.getState().input).toBe("#politoed !muddy-water x incineroar");
    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("button", {
        name: /remove politoed set/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("attacker-summary")).getByRole("button", {
        name: "Switch",
      }),
    ).toBeInTheDocument();
  });

  test("selecting a saved summary move keeps the other move slots intact", () => {
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

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");

    fireEvent.click(
      within(summary).getByRole("button", { name: /use ice beam for calc/i }),
    );

    expect(useOmniStore.getState().input).toBe("#politoed !ice-beam x incineroar");
    expect(
      within(summary).getByRole("combobox", { name: "Move 1" }),
    ).toHaveValue("Muddy Water");
    expect(
      within(summary).getByRole("combobox", { name: "Move 2" }),
    ).toHaveValue("Ice Beam");
    expect(
      within(summary).getByRole("combobox", { name: "Move 3" }),
    ).toHaveValue("Protect");
    expect(
      within(summary).getByRole("combobox", { name: "Move 4" }),
    ).toHaveValue("Helping Hand");
    expect(useTeamStore.getState().importedSets.politoed.moves).toEqual([
      "Muddy Water",
      "Ice Beam",
      "Protect",
      "Helping Hand",
    ]);
  });

  test("external prompt moves replace only the selected summary slot, defaulting to the first slot", () => {
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

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !hydro-pump x incineroar");
    });

    let summary = screen.getByTestId("attacker-summary");
    expect(
      within(summary).getByRole("combobox", { name: "Move 1" }),
    ).toHaveValue("Hydro Pump");
    expect(
      within(summary).getByRole("combobox", { name: "Move 2" }),
    ).toHaveValue("Ice Beam");

    fireEvent.click(
      within(summary).getByRole("button", { name: /use protect for calc/i }),
    );

    act(() => {
      useOmniStore.getState().setInput("#politoed !weather-ball x incineroar");
    });

    summary = screen.getByTestId("attacker-summary");
    expect(
      within(summary).getByRole("combobox", { name: "Move 1" }),
    ).toHaveValue("Muddy Water");
    expect(
      within(summary).getByRole("combobox", { name: "Move 2" }),
    ).toHaveValue("Ice Beam");
    expect(
      within(summary).getByRole("combobox", { name: "Move 3" }),
    ).toHaveValue("Weather Ball");
    expect(
      within(summary).getByRole("combobox", { name: "Move 4" }),
    ).toHaveValue("Helping Hand");
    expect(useTeamStore.getState().importedSets.politoed.moves).toEqual([
      "Muddy Water",
      "Ice Beam",
      "Protect",
      "Helping Hand",
    ]);
  });

  test("editing a saved summary set keeps the prompt compacted and preserves globals", () => {
    act(() => {
      useTeamStore.getState().saveSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        level: 50,
        nature: "Modest",
        statPoints: { hp: 32, atk: 0, def: 1, spa: 13, spd: 1, spe: 19 },
        evs: { hp: 252, atk: 0, def: 8, spa: 104, spd: 8, spe: 152 },
        ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      });
    });

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar ~rain");
    });

    const summary = screen.getByTestId("attacker-summary");
    const itemCombobox = within(summary).getByRole("combobox", { name: "Item" });

    fireEvent.change(itemCombobox, { target: { value: "Mystic Water" } });
    fireEvent.blur(itemCombobox);

    expect(useTeamStore.getState().importedSets.politoed.item).toBe(
      "Mystic Water",
    );
    expect(useOmniStore.getState().input).toBe(
      "#politoed !muddy-water x incineroar ~rain",
    );
  });

  test("renaming a saved summary set rewrites the compact prompt reference", () => {
    act(() => {
      useTeamStore.getState().saveSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        level: 50,
        nature: "Modest",
        statPoints: { hp: 32, atk: 0, def: 1, spa: 13, spd: 1, spe: 19 },
        evs: { hp: 252, atk: 0, def: 8, spa: 104, spd: 8, spe: 152 },
        ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      });
    });

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !muddy-water x incineroar");
    });

    const summary = screen.getByTestId("attacker-summary");
    const nicknameInput = within(summary).getByRole("textbox", {
      name: "Set Name",
    });

    fireEvent.change(nicknameInput, { target: { value: "rain-toed" } });
    fireEvent.blur(nicknameInput);

    expect(useTeamStore.getState().importedSets.politoed.nickname).toBe(
      "rain-toed",
    );
    expect(useOmniStore.getState().input).toBe(
      "#raintoed !muddy-water x incineroar",
    );
  });

  test("summary export copies the current visible set as Showdown text", async () => {
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

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("#politoed !hydro-pump x incineroar");
    });

    await act(async () => {
      fireEvent.click(
        within(screen.getByTestId("attacker-summary")).getByRole("button", {
          name: "Export",
        }),
      );
    });

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Politoed @ Mystic Water"),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Ability: Drizzle"),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Modest Nature"),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("- Hydro Pump"),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("- Ice Beam"),
    );
  });

  test("summary mega switch reflects active state and toggles both directions", () => {
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

    let megaButton = within(screen.getByTestId("attacker-summary")).getByRole(
      "button",
      {
        name: /switch to mega form/i,
      },
    );

    expect(megaButton).toHaveAttribute("aria-pressed", "false");
    expect(megaButton).toHaveClass("theme-icon-button-mega-inactive");

    fireEvent.click(megaButton);

    expect(useOmniStore.getState().input).toBe(
      "#charizardmegay !heat-wave x tinkaton",
    );
    expect(useTeamStore.getState().importedSets.charizard).toBeUndefined();
    expect(useTeamStore.getState().importedSets.charizardmegay).toBeDefined();

    megaButton = within(screen.getByTestId("attacker-summary")).getByRole(
      "button",
      {
        name: /switch to base form/i,
      },
    );

    expect(megaButton).toHaveAttribute("aria-pressed", "true");
    expect(megaButton).toHaveClass("theme-icon-button-mega-active");

    fireEvent.click(megaButton);

    expect(useOmniStore.getState().input).toBe("#charizard !heat-wave x tinkaton");
    expect(useTeamStore.getState().importedSets.charizard).toBeDefined();
    expect(useTeamStore.getState().importedSets.charizardmegay).toBeUndefined();

    megaButton = within(screen.getByTestId("attacker-summary")).getByRole(
      "button",
      {
        name: /switch to mega form/i,
      },
    );

    expect(megaButton).toHaveAttribute("aria-pressed", "false");
    expect(megaButton).toHaveClass("theme-icon-button-mega-inactive");
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

    render(<OmniTextareaWithRef textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    const textarea = screen.getByTestId("omni-textarea");
    fireEvent.change(textarea, {
      target: {
        value: "politoed !muddy-water x incineroar ",
        selectionStart: 35,
      },
      currentTarget: {
        value: "politoed !muddy-water x incineroar ",
        selectionStart: 35,
      },
    });

    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water x incineroar ",
    );
  });

  test("surfaces rain from another resolved weather-setting ability as an opt-in suggestion", () => {
    act(() => {
      useOmniStore.getState().setInput("pelipper !hurricane x tinkaton");
    });

    expect(useOmniStore.getState().input).toBe(
      "pelipper !hurricane x tinkaton",
    );
    expect(useOmniStore.getState().suggestionOptions[0]?.value).toBe("~rain");
  });

  test("does not treat a mega stone alone as a mega weather setter", () => {
    act(() => {
      useOmniStore
        .getState()
        .setInput("charizard !heat-wave @charizardite-y x tinkaton");
    });

    expect(useOmniStore.getState().input).toBe(
      "charizard !heat-wave @charizardite-y x tinkaton",
    );
    expect(useOmniStore.getState().suggestionOptions[0]?.value).not.toBe(
      "~sun",
    );
  });

  test("surfaces weather for an explicit mega form as an opt-in suggestion", () => {
    act(() => {
      useOmniStore
        .getState()
        .setInput("charizard-mega-y !heat-wave @charizardite-y x tinkaton");
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
    expect(useOmniStore.getState().input).toBe(
      "incineroar !flare-blitz x tinkaton",
    );
    expect(useOmniStore.getState().suggestionOptions[0]?.value).not.toBe(
      "~sun",
    );
  });

  test("lets the user opt in to the suggested global token with Tab", () => {
    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x tinkaton");
    });
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water x tinkaton",
    );
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

    render(<OmniTextareaWithRef textareaRef={textareaRef} />);

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
      "incineroar !flare-blitz x tinkaton []".length,
    );
    expect(textareaRef.current?.selectionEnd).toBe(
      "incineroar !flare-blitz x tinkaton []".length,
    );
  });
});
