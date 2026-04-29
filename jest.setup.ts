import "@testing-library/jest-dom";

import { calculateDamageResults } from "@/lib/calc/damage-engine";

globalThis.__UNBURDEN_TEST_CALCULATE_DAMAGE_RESULTS__ =
  calculateDamageResults;
