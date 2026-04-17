import regulationVerification from "@/lib/data/regulation-verification";

const {
  buildRosterHash,
  compareRegulationRosters,
  formatVerificationDate,
  parseSerebiiRegulationRosterNames,
  resolveRegulationRosterIds,
} = regulationVerification;

describe("regulation verification helpers", () => {
  test("parses the Serebii regulation roster names from the roster section", () => {
    const html = `
      <p><h2 style="font-size:14pt;text-decoration:underline;">Newly Useable Pok&eacute;mon</h2></p>
      <table class="tab" align="center">
        <tr>
          <td align="center" class="fooinfo">
            <a href="/pokedex-champions/venusaur/">Venusaur<br  />フシギバナ</a>
          </td>
        </tr>
        <tr>
          <td align="center" class="fooinfo">
            <a href="/pokedex-champions/charizard/">Mega Charizard X<br  />リザードン</a>
          </td>
        </tr>
      </table>
    `;

    expect(parseSerebiiRegulationRosterNames(html)).toEqual([
      "Venusaur",
      "Mega Charizard X",
    ]);
  });

  test("resolves parsed roster names to canonical species ids", () => {
    const speciesIdIndex = new Map<string, string>([
      ["venusaur", "venusaur"],
      ["megacharizardx", "charizardmegax"],
    ]);

    expect(
      resolveRegulationRosterIds(
        ["Venusaur", "Mega Charizard X", "Missingmon"],
        speciesIdIndex,
      ),
    ).toEqual({
      liveRosterIds: ["charizardmegax", "venusaur"],
      unresolvedSpeciesNames: ["Missingmon"],
    });
  });

  test("compares live and local rosters symmetrically", () => {
    expect(
      compareRegulationRosters(
        ["venusaur", "charizard", "blastoise"],
        ["venusaur", "blastoise", "pikachu"],
      ),
    ).toEqual({
      missingFromLocal: ["charizard"],
      extraInLocal: ["pikachu"],
    });
  });

  test("builds a stable hash regardless of roster ordering", async () => {
    await expect(
      Promise.all([
        buildRosterHash(["charizard", "venusaur", "venusaur"]),
        buildRosterHash(["venusaur", "charizard"]),
      ]),
    ).resolves.toEqual([
      "sha256:aa6a9e7575676010f53519e69cfe541d30749209edc16e50a980bf843112599b",
      "sha256:aa6a9e7575676010f53519e69cfe541d30749209edc16e50a980bf843112599b",
    ]);
  });

  test("formats verification dates as yyyy-mm-dd", () => {
    expect(
      formatVerificationDate(new Date("2026-04-17T19:30:00.000Z")),
    ).toBe("2026-04-17");
  });
});
