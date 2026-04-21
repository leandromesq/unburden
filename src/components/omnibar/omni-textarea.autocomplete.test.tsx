import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";

import { OmniTextarea } from "@/components/omnibar/omni-textarea";
import { resetOmniStore, useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

describe("omni textarea autocomplete regressions", () => {
  beforeEach(() => {
    resetOmniStore();
    useTeamStore.getState().clearSets();
  });

  test("trims trailing whitespace from a single-token selection", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(<OmniTextarea textareaRef={textareaRef} />);

    act(() => {
      useOmniStore
        .getState()
        .setInput("incineroar !throat-chop x #gengarmega");
    });

    const textarea = screen.getByTestId("omni-textarea");
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(0, "incineroar ".length);

    fireEvent.select(textarea);

    expect(textareaRef.current?.selectionStart).toBe(0);
    expect(textareaRef.current?.selectionEnd).toBe("incineroar".length);
  });

  test("keeps the caret after the separator space when Tab accepts it", async () => {
    const textareaRef = createRef<HTMLTextAreaElement>();
    const baseInput = "politoed !muddy-water";
    const spacedInput = `${baseInput} `;

    render(<OmniTextarea textareaRef={textareaRef} />);

    act(() => {
      useOmniStore.getState().setInput(baseInput);
    });

    const textarea = screen.getByTestId("omni-textarea");
    textareaRef.current?.focus();

    fireEvent.change(textarea, {
      target: {
        value: spacedInput,
        selectionStart: spacedInput.length,
      },
      currentTarget: {
        value: spacedInput,
        selectionStart: spacedInput.length,
      },
    });

    fireEvent.keyDown(textarea, { key: "Tab" });

    await waitFor(() => {
      expect(useOmniStore.getState().input).toBe(`${baseInput} x `);
    });

    await waitFor(() => {
      expect(textareaRef.current?.selectionStart).toBe(
        textareaRef.current?.value.length,
      );
    });

    expect(textareaRef.current?.selectionEnd).toBe(
      textareaRef.current?.value.length,
    );
  });
});
