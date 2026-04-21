import { fireEvent, render, screen, within } from "@testing-library/react";

import { PokemonSetEditorModal } from "@/components/omnibar/pokemon-set-editor-modal";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import type { ImportedSet } from "@/lib/types";

function createInitialSet(
  overrides: Partial<ImportedSet> = {},
): ImportedSet {
  return createImportedSet({
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
    ...overrides,
  });
}

describe("PokemonSetEditorModal nature marker synchronization", () => {
  test("changing the nature dropdown updates the SP marker inputs", () => {
    const handleSave = jest.fn();

    render(
      <PokemonSetEditorModal
        initialSet={createInitialSet()}
        onClose={() => {}}
        onSave={handleSave}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /edit politoed set/i });
    const natureSelect = within(dialog).getByRole("combobox", {
      name: "Nature",
    });

    fireEvent.change(natureSelect, { target: { value: "Modest" } });

    expect(natureSelect).toHaveValue("Modest");
    expect(within(dialog).getByLabelText("Atk")).toHaveValue("0-");
    expect(within(dialog).getByLabelText("SpA")).toHaveValue("32+");
    expect(within(dialog).getByLabelText("HP")).toHaveValue("0");
    expect(within(dialog).getByLabelText("Def")).toHaveValue("0");
    expect(within(dialog).getByLabelText("SpD")).toHaveValue("0");
    expect(within(dialog).getByLabelText("Spe")).toHaveValue("0");
  });

  test("typing paired markers updates the nature dropdown", () => {
    const handleSave = jest.fn();

    render(
      <PokemonSetEditorModal
        initialSet={createInitialSet({
          nature: "Hardy",
          statPoints: {
            hp: 0,
            atk: 0,
            def: 0,
            spa: 32,
            spd: 0,
            spe: 0,
          },
        })}
        onClose={() => {}}
        onSave={handleSave}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /edit politoed set/i });
    const natureSelect = within(dialog).getByRole("combobox", {
      name: "Nature",
    });
    const atkInput = within(dialog).getByLabelText("Atk");
    const spaInput = within(dialog).getByLabelText("SpA");

    fireEvent.focus(atkInput);
    fireEvent.change(atkInput, { target: { value: "0-" } });

    fireEvent.focus(spaInput);
    fireEvent.change(spaInput, { target: { value: "32+" } });

    expect(natureSelect).toHaveValue("Modest");
    expect(atkInput).toHaveValue("0-");
    expect(spaInput).toHaveValue("32+");
  });

  test("replacing zero with a new numeric value does not concatenate with the previous zero", () => {
    const handleSave = jest.fn();

    render(
      <PokemonSetEditorModal
        initialSet={createInitialSet({
          statPoints: {
            hp: 0,
            atk: 0,
            def: 0,
            spa: 0,
            spd: 0,
            spe: 0,
          },
        })}
        onClose={() => {}}
        onSave={handleSave}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /edit politoed set/i });
    const hpInput = within(dialog).getByLabelText("HP");

    fireEvent.focus(hpInput);
    fireEvent.change(hpInput, { target: { value: "32" } });

    expect(hpInput).toHaveValue("32");
  });

  test("saving after marker edits persists the resolved nature and numeric stat points", () => {
    const handleSave = jest.fn();

    render(
      <PokemonSetEditorModal
        initialSet={createInitialSet({
          nature: "Hardy",
          statPoints: {
            hp: 0,
            atk: 0,
            def: 0,
            spa: 32,
            spd: 0,
            spe: 0,
          },
        })}
        onClose={() => {}}
        onSave={handleSave}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /edit politoed set/i });
    const atkInput = within(dialog).getByLabelText("Atk");
    const spaInput = within(dialog).getByLabelText("SpA");

    fireEvent.focus(atkInput);
    fireEvent.change(atkInput, { target: { value: "0-" } });

    fireEvent.focus(spaInput);
    fireEvent.change(spaInput, { target: { value: "32+" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        nature: "Modest",
        statPoints: expect.objectContaining({
          atk: 0,
          spa: 32,
        }),
      }),
    );
  });

  test("syncs the SP inputs when a different initial set is passed in", () => {
    const handleSave = jest.fn();
    const { rerender } = render(
      <PokemonSetEditorModal
        key="politoed"
        initialSet={createInitialSet()}
        onClose={() => {}}
        onSave={handleSave}
      />,
    );

    rerender(
      <PokemonSetEditorModal
        key="incineroar"
        initialSet={createInitialSet({
          speciesId: "incineroar",
          speciesName: "Incineroar",
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
        })}
        onClose={() => {}}
        onSave={handleSave}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /edit incineroar set/i });

    expect(within(dialog).getByLabelText("HP")).toHaveValue("12");
    expect(within(dialog).getByLabelText("Atk")).toHaveValue("20+");
    expect(within(dialog).getByLabelText("SpA")).toHaveValue("0-");
    expect(within(dialog).getByLabelText("Spe")).toHaveValue("20");
  });

  test("shows move type icons in the selected fields and move options", () => {
    const handleSave = jest.fn();

    render(
      <PokemonSetEditorModal
        initialSet={createInitialSet()}
        onClose={() => {}}
        onSave={handleSave}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /edit politoed set/i });
    const moveOneCombobox = within(dialog).getByRole("combobox", {
      name: "Move 1",
    });

    expect(
      within(dialog).getAllByRole("img", { name: "Water type" }),
    ).toHaveLength(1);

    fireEvent.focus(moveOneCombobox);

    expect(
      within(dialog).getAllByRole("img", { name: "Water type" }),
    ).toHaveLength(2);
  });
});
