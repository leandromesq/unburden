"use client";

import { create } from "zustand";

import {
  DEFAULT_SPEED_GLOBALS,
  formatSpeedCommand,
  parseSpeedCommand,
} from "@/lib/speed/speed-command";
import type {
  SpeedBenchmarkShareState,
  SpeedGlobalState,
  SpeedSideState,
} from "@/lib/types";

interface SpeedBenchmarkStore {
  command: string;
  lastValidCommand: string;
  subject: SpeedSideState | null;
  comparator: SpeedSideState | null;
  globals: SpeedGlobalState;
  issues: string[];
  explicitComparator: boolean;
  setCommand: (command: string) => void;
  setSubject: (side: SpeedSideState | null) => void;
  setComparator: (side: SpeedSideState | null) => void;
  clearSubject: () => void;
  clearComparator: () => void;
  swapSides: () => void;
  updateSubject: (patch: Partial<SpeedSideState>) => void;
  updateComparator: (patch: Partial<SpeedSideState>) => void;
  toggleGlobal: (key: keyof SpeedGlobalState) => void;
  resetSides: () => void;
  hydrateShareState: (state: SpeedBenchmarkShareState) => void;
}

function parseCommandState(command: string) {
  const parsed = parseSpeedCommand(command);
  const hasBlockingIssue = parsed.issues.some((issue) =>
    issue.startsWith("Could not resolve"),
  );

  return {
    parsed,
    hasBlockingIssue,
  };
}

function syncCommandFromState(
  subject: SpeedSideState | null,
  comparator: SpeedSideState | null,
  globals: SpeedGlobalState,
) {
  return formatSpeedCommand(subject, comparator, globals);
}

export const useSpeedBenchmarkStore = create<SpeedBenchmarkStore>((set) => ({
  command: "",
  lastValidCommand: "",
  subject: null,
  comparator: null,
  globals: DEFAULT_SPEED_GLOBALS,
  issues: [],
  explicitComparator: false,
  setCommand: (command) => {
    const { parsed, hasBlockingIssue } = parseCommandState(command);

    set((state) => ({
      command,
      lastValidCommand: hasBlockingIssue ? state.lastValidCommand : command,
      subject: hasBlockingIssue ? state.subject : parsed.subject,
      comparator: hasBlockingIssue ? state.comparator : parsed.comparator,
      globals: hasBlockingIssue ? state.globals : parsed.globals,
      issues: parsed.issues,
      explicitComparator: hasBlockingIssue
        ? state.explicitComparator
        : Boolean(parsed.comparator),
    }));
  },
  setSubject: (side) =>
    set((state) => ({
      subject: side,
      command: syncCommandFromState(side, state.comparator, state.globals),
      lastValidCommand: syncCommandFromState(side, state.comparator, state.globals),
    })),
  setComparator: (side) =>
    set((state) => ({
      comparator: side,
      explicitComparator: Boolean(side),
      command: syncCommandFromState(state.subject, side, state.globals),
      lastValidCommand: syncCommandFromState(state.subject, side, state.globals),
    })),
  clearSubject: () =>
    set((state) => {
      const command = syncCommandFromState(null, state.comparator, state.globals);

      return {
        subject: null,
        command,
        lastValidCommand: command,
        issues: [],
      };
    }),
  clearComparator: () =>
    set((state) => {
      const command = syncCommandFromState(state.subject, null, state.globals);

      return {
        comparator: null,
        explicitComparator: false,
        command,
        lastValidCommand: command,
        issues: [],
      };
    }),
  swapSides: () =>
    set((state) => {
      if (!state.comparator) return state;

      const command = syncCommandFromState(
        state.comparator,
        state.subject,
        state.globals,
      );

      return {
        subject: state.comparator,
        comparator: state.subject,
        explicitComparator: Boolean(state.subject),
        command,
        lastValidCommand: command,
        issues: [],
      };
    }),
  updateSubject: (patch) =>
    set((state) => {
      const subject = state.subject ? { ...state.subject, ...patch } : null;
      const command = syncCommandFromState(subject, state.comparator, state.globals);

      return { subject, command, lastValidCommand: command };
    }),
  updateComparator: (patch) =>
    set((state) => {
      const comparator = state.comparator ? { ...state.comparator, ...patch } : null;
      const command = syncCommandFromState(state.subject, comparator, state.globals);

      return { comparator, command, lastValidCommand: command };
    }),
  toggleGlobal: (key) =>
    set((state) => {
      const globals = { ...state.globals, [key]: !state.globals[key] };
      const command = syncCommandFromState(state.subject, state.comparator, globals);

      return { globals, command, lastValidCommand: command };
    }),
  resetSides: () =>
    set((state) => {
      const command = syncCommandFromState(null, null, state.globals);

      return {
        command,
        lastValidCommand: command,
        subject: null,
        comparator: null,
        explicitComparator: false,
        issues: [],
      };
    }),
  hydrateShareState: (shareState) =>
    set({
      command: shareState.command,
      lastValidCommand: shareState.command,
      subject: shareState.subject,
      comparator: shareState.comparator,
      globals: shareState.globals,
      explicitComparator: Boolean(shareState.comparator),
      issues: [],
    }),
}));
