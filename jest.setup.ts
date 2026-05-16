import "@testing-library/jest-dom";

import { calculateDamageResults } from "@/lib/calc/damage-engine";

jest.mock("next/server", () => ({
  after: jest.fn((callback: () => void) => callback()),
}));

globalThis.__UNBURDEN_TEST_CALCULATE_DAMAGE_RESULTS__ =
  calculateDamageResults;
