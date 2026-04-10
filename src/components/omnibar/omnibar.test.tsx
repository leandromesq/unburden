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
      useOmniStore.getState().setInput("flutter m");
    });

    const textarea = screen.getByTestId("omni-textarea");
    textareaRef.current?.focus();
    fireEvent.keyDown(textarea, { key: "Tab" });

    expect(useOmniStore.getState().input).toBe("flutter mane");
    expect(document.activeElement).toBe(textareaRef.current);
  });

  test("Arrow keys navigate suggestion options and Tab applies the highlighted one", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<OmniTextarea textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput("flutter mane !moonblast x ogerpon ");
    });

    const textarea = screen.getByTestId("omni-textarea");
    textareaRef.current?.focus();

    fireEvent.keyDown(textarea, { key: "ArrowDown" });
    fireEvent.keyDown(textarea, { key: "Tab" });

    expect(useOmniStore.getState().input).toBe(
      "flutter mane !moonblast x ogerpon <-5",
    );
    expect(document.activeElement).toBe(textareaRef.current);
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
      useOmniStore.getState().setInput("flutter mane mo");
    });

    fireEvent.click(screen.getByRole("button", { name: /!moonblast/i }));

    expect(useOmniStore.getState().input).toBe("flutter mane !moonblast");
  });

  test("modifier chip toggles its token in the current input", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitches textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("flutter mane !moonblast x ogerpon");
    });

    fireEvent.click(screen.getByRole("button", { name: /^Rain$/i }));
    expect(useOmniStore.getState().input).toBe(
      "flutter mane !moonblast x ogerpon ~rain",
    );

    fireEvent.click(screen.getByRole("button", { name: /^Rain$/i }));

    expect(useOmniStore.getState().input).toBe("flutter mane !moonblast x ogerpon");
  });

  test("stage slider rewrites attacker and defender stages intuitively", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitches textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("flutter mane !moonblast >+2 x ogerpon <-1");
    });

    fireEvent.change(screen.getByLabelText("attacker stage slider"), {
      target: { value: "4" },
    });
    expect(useOmniStore.getState().input).toBe(
      "flutter mane !moonblast >+4 x ogerpon <-1",
    );

    fireEvent.change(screen.getByLabelText("defender stage slider"), {
      target: { value: "0" },
    });
    expect(useOmniStore.getState().input).toBe(
      "flutter mane !moonblast >+4 x ogerpon",
    );
  });

  test("speed slider rewrites attacker and defender speed stages independently", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitches textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("regieleki !electro-ball >spe+2 x amoonguss <spe-1");
    });

    fireEvent.change(screen.getByLabelText("attacker speed slider"), {
      target: { value: "6" },
    });
    expect(useOmniStore.getState().input).toBe(
      "regieleki !electro-ball >spe+6 x amoonguss <spe-1",
    );

    fireEvent.change(screen.getByLabelText("defender speed slider"), {
      target: { value: "0" },
    });
    expect(useOmniStore.getState().input).toBe(
      "regieleki !electro-ball >spe+6 x amoonguss",
    );
  });

  test("hp percentage chips set and replace attacker and defender current hp", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitches textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("flutter mane !moonblast x ogerpon");
    });

    const hp25Buttons = screen.getAllByRole("button", { name: "25%" });
    const hp50Buttons = screen.getAllByRole("button", { name: "50%" });

    fireEvent.click(hp25Buttons[0]);
    expect(useOmniStore.getState().input).toBe(
      "flutter mane !moonblast %25 x ogerpon",
    );

    fireEvent.click(hp50Buttons[1]);
    expect(useOmniStore.getState().input).toBe(
      "flutter mane !moonblast %25 x ogerpon %50",
    );

    fireEvent.click(hp50Buttons[0]);
    expect(useOmniStore.getState().input).toBe(
      "flutter mane !moonblast %50 x ogerpon %50",
    );
  });

  test("results panel stays hidden until an explicit move is present", () => {
    render(<ResultsPanel />);

    act(() => {
      useOmniStore.getState().setInput("flutter mane x ogerpon");
    });
    expect(screen.queryByTestId("results-panel")).not.toBeInTheDocument();

    act(() => {
      useOmniStore.getState().setInput("flutter mane !moonblast x ogerpon");
    });
    expect(screen.getByTestId("results-panel")).toBeInTheDocument();
  });

  test("Tab applies the highlighted suggestion even without inline ghost text", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<OmniTextarea textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput("flutter mane !moonblast x ogerpon ");
    });

    const textarea = screen.getByTestId("omni-textarea");
    textareaRef.current?.focus();
    fireEvent.keyDown(textarea, { key: "Tab" });

    expect(document.activeElement).toBe(textareaRef.current);
    expect(useOmniStore.getState().input).toBe("flutter mane !moonblast x ogerpon <-6");
  });

  test("Enter scrolls to the results when a calculation is ready", () => {
    const scrollIntoView = jest.fn();

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("flutter mane !moonblast x ogerpon");
    });

    fireEvent.keyDown(screen.getByTestId("omni-textarea"), { key: "Enter" });

    expect(scrollIntoView).toHaveBeenCalled();
  });

  test("renders attacker and defender summaries next to the composer", () => {
    render(<OmniComposer />);

    act(() => {
      useOmniStore.getState().setInput("flutter mane !moonblast x ogerpon");
    });

    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("Flutter Mane");
    expect(screen.getByTestId("attacker-summary")).toHaveTextContent("Moonblast");
    expect(screen.getByTestId("defender-summary")).toHaveTextContent("Ogerpon-Wellspring");
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

  test("automatically adds weather from a resolved weather-setting ability", () => {
    act(() => {
      useOmniStore.getState().setInput("torkoal !heat-wave x tinkaton");
    });

    expect(useOmniStore.getState().input).toBe(
      "torkoal !heat-wave x tinkaton ~sun",
    );
  });

  test("automatically adds terrain from a resolved terrain-setting ability", () => {
    act(() => {
      useOmniStore.getState().setInput("rillaboom !wood-hammer x tinkaton");
    });

    expect(useOmniStore.getState().input).toBe(
      "rillaboom !wood-hammer x tinkaton ~grassy-terrain",
    );
  });

  test("automatically updates the prompt for mega-stone weather setters", () => {
    act(() => {
      useOmniStore.getState().setInput("charizard !heat-wave @charizardite-y x tinkaton");
    });

    expect(useOmniStore.getState().input).toBe(
      "charizard !heat-wave @charizardite-y x tinkaton ~sun",
    );
  });

  test("replaces stale automatic weather and terrain tokens when the prompt changes", () => {
    act(() => {
      useOmniStore.getState().setInput("torkoal !heat-wave x tinkaton");
    });
    expect(useOmniStore.getState().input).toBe(
      "torkoal !heat-wave x tinkaton ~sun",
    );

    act(() => {
      useOmniStore.getState().setInput("flutter mane !moonblast x tinkaton");
    });
    expect(useOmniStore.getState().input).toBe(
      "flutter mane !moonblast x tinkaton",
    );
  });

  test("lets the user delete an auto-added global token without re-adding it", () => {
    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x tinkaton");
    });
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water x tinkaton ~rain",
    );

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water x tinkaton");
    });
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water x tinkaton",
    );

    act(() => {
      useOmniStore.getState().setInput("politoed !muddy-water >+1 x tinkaton");
    });
    expect(useOmniStore.getState().input).toBe(
      "politoed !muddy-water >+1 x tinkaton",
    );
  });

  test("uses the slower pokemon when weather setters conflict", () => {
    act(() => {
      useOmniStore.getState().setInput("pelipper !hurricane x torkoal");
    });

    expect(useOmniStore.getState().input).toBe(
      "pelipper !hurricane x torkoal ~sun",
    );
  });

  test("uses the slower pokemon when terrain setters conflict", () => {
    act(() => {
      useOmniStore.getState().setInput("miraidon !electro-drift x rillaboom");
    });

    expect(useOmniStore.getState().input).toBe(
      "miraidon !electro-drift x rillaboom ~grassy-terrain",
    );
  });
});
