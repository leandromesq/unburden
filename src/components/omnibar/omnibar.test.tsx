import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";

import { ModifierSwitches } from "@/components/omnibar/modifier-switches";
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

  test("modifier chip inserts only once for the current input", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<ModifierSwitches textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("flutter mane !moonblast x ogerpon");
    });

    fireEvent.click(screen.getByRole("button", { name: /^Rain$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Rain$/i }));

    expect(useOmniStore.getState().input).toBe(
      "flutter mane !moonblast x ogerpon ~rain",
    );
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

  test("Tab without an active suggestion stays in the textarea", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<OmniTextarea textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput("flutter mane !moonblast x ogerpon");
    });

    const textarea = screen.getByTestId("omni-textarea");
    textareaRef.current?.focus();
    fireEvent.keyDown(textarea, { key: "Tab" });

    expect(document.activeElement).toBe(textareaRef.current);
    expect(useOmniStore.getState().input).toBe("flutter mane !moonblast x ogerpon");
  });
});
