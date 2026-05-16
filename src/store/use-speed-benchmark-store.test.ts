import { useSpeedBenchmarkStore } from "@/store/use-speed-benchmark-store";

describe("speed benchmark store", () => {
  beforeEach(() => {
    useSpeedBenchmarkStore.setState({
      command: "",
      lastValidCommand: "",
      subject: null,
      comparator: null,
      globals: {
        sun: false,
        rain: false,
        sand: false,
        snow: false,
        electricTerrain: false,
        trickRoom: false,
      },
      issues: [],
      explicitComparator: false,
    });
  });

  test("clears comparator without clearing subject or global modifiers", () => {
    const store = useSpeedBenchmarkStore.getState();

    store.setCommand("basculegion x aerodactyl ~rain");
    useSpeedBenchmarkStore.getState().clearComparator();

    const state = useSpeedBenchmarkStore.getState();
    expect(state.subject?.speciesId).toBe("basculegion");
    expect(state.comparator).toBeNull();
    expect(state.globals.rain).toBe(true);
    expect(state.command).toBe("Basculegion ~rain");
  });

  test("swaps sides only when an explicit comparator exists", () => {
    const store = useSpeedBenchmarkStore.getState();

    store.setCommand("basculegion x aerodactyl spe+1 ~trick-room");
    useSpeedBenchmarkStore.getState().swapSides();

    const state = useSpeedBenchmarkStore.getState();
    expect(state.subject?.speciesId).toBe("aerodactyl");
    expect(state.subject?.speedStage).toBe(1);
    expect(state.comparator?.speciesId).toBe("basculegion");
    expect(state.globals.trickRoom).toBe(true);
    expect(state.command).toBe("Aerodactyl spe+1 x Basculegion ~trick-room");
  });
});
