import { fireEvent, render, screen } from "@testing-library/react";

import { PokemonSprite } from "@/components/omnibar/pokemon-summary/pokemon-sprite";

describe("PokemonSprite", () => {
  test("falls back to the next sprite source before showing the placeholder", () => {
    render(
      <PokemonSprite
        sources={["https://example.com/one.png", "https://example.com/two.png"]}
        name="Politoed"
        primaryType="Water"
      />,
    );

    const sprite = screen.getByRole("img", { name: "Politoed" });
    expect(sprite).toHaveAttribute("src", "https://example.com/one.png");

    fireEvent.error(sprite);

    expect(screen.getByRole("img", { name: "Politoed" })).toHaveAttribute(
      "src",
      "https://example.com/two.png",
    );
  });

  test("shows a typed placeholder after all sprite sources fail", () => {
    render(
      <PokemonSprite
        sources={["https://example.com/missing.png"]}
        name="Archaludon"
        primaryType="Steel"
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Archaludon" }));

    expect(
      screen.getByRole("img", { name: "Archaludon sprite fallback" }),
    ).toHaveTextContent("AR");
  });

  test("renders the placeholder immediately when there are no sprite sources", () => {
    render(
      <PokemonSprite sources={[]} name="Incineroar" primaryType="Fire" />,
    );

    expect(
      screen.getByRole("img", { name: "Incineroar sprite fallback" }),
    ).toHaveTextContent("IN");
  });
});

