import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";

import { ModifierSwitches } from "@/components/omnibar/modifier-switches";
import { OmniComposer } from "@/components/omnibar/omni-composer";
import { OmniTextarea } from "@/components/omnibar/omni-textarea";
import { QuickSuggestions } from "@/components/omnibar/quick-suggestions";
import { ResultsPanel } from "@/components/omnibar/results-panel";
import { resetOmniStore, useOmniStore } from "@/store/use-omni-store";

describe("omnibar components", () => {
  beforeEach(() => {
    resetOmniStore();
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

  test("renders attacker and defender summaries next to the composer", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x incineroar");
    });

    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("Politoed");
    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("Muddy Water");
    expect(screen.getByTestId("defender-summary")).toHaveTextContent("Incineroar");
  });

  test("renders an explicit defender item in the defender summary", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("charizard !heat-wave x tinkaton @assault-vest");
    });

    expect(screen.getByTestId("defender-summary")).toHaveTextContent("Assault Vest");
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

  test("surfaces weather for mega-stone setters as an opt-in suggestion", () => {
    act(() => {
      useOmniStore.getState().setInput("charizard !heat-wave @charizardite-y x tinkaton");
    });

    expect(useOmniStore.getState().input).toBe(
      "charizard !heat-wave @charizardite-y x tinkaton",
    );
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
