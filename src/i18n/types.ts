import type { AppLocale } from "@/i18n/locales";

export interface HotkeyMessage {
  keys: string[];
  description: string;
}

export interface SyntaxRowMessage {
  token: string;
  description: string;
  example: string;
}

export interface TokenHelpMessage {
  token: string;
  label: string;
}

export interface AppDictionary {
  metadata: {
    description: string;
  };
  localeToggle: {
    label: string;
    options: Record<AppLocale, string>;
  };
  themeToggle: {
    moon: string;
    sun: string;
  };
  home: {
    kicker: string;
    about: string;
    heroDescription: string;
    toggleModifiers: string;
    modifiers: string;
    noIssues: string;
    resultsUpdated: string;
    resultsNotReady: string;
  };
  testerLinks: {
    joinDiscord: string;
    giveFeedback: string;
  };
  aboutSection: {
    highlight: string;
    actions: string;
    actionsDescription: string;
    emptyActions: string;
    feedback: string;
    discord: string;
    donate: string;
  };
  legalFooter: {
    eyebrow: string;
    title: string;
    copyright: string;
    proprietary: string;
    thirdParty: string;
  };
  helpBubble: {
    triggerAria: string;
    title: string;
    description: string;
    closeAria: string;
    structure: string;
    structureDescription: string;
    coreTokens: string;
    segmentTokens: string;
    attacker: string;
    defender: string;
    hotkeys: string;
    tips: string;
    hotkeyRows: HotkeyMessage[];
    syntaxRows: SyntaxRowMessage[];
    attackerModifiers: TokenHelpMessage[];
    defenderModifiers: TokenHelpMessage[];
    tipsList: string[];
  };
  bugReport: {
    openButton: string;
    title: string;
    description: string;
    closeAria: string;
    questionLabel: string;
    placeholder: string;
    attachedContext: string;
    currentPrompt: string;
    strictMode: string;
    on: string;
    off: string;
    privacy: string;
    idleMessage: string;
    viewIssue: string;
    cancel: string;
    send: string;
    sending: string;
    server: {
      notConfigured: string;
      tooShort: string;
      tooLong: string;
      honeypotSuccess: string;
      duplicate: string;
      misconfigured: string;
      createFailed: string;
      unexpected: string;
      rateLimit: (minutes: number) => string;
      filedWithNumber: (number: number) => string;
      filedSuccess: string;
    };
  };
  importSetModal: {
    dialogAria: string;
    title: string;
    closeAria: string;
    description: string;
    parseError: string;
    parse: string;
    saveSets: (count: number) => string;
    cancel: string;
    preview: (count: number) => string;
  };
  strictMode: {
    groupLabel: string;
    fast: string;
    strict: string;
    optionAria: (label: string) => string;
  };
  summary: {
    resolvePokemon: string;
    resolveQuickSummary: (side: string) => string;
    import: string;
    switch: string;
    save: string;
    edit: string;
  };
  modifierSwitches: {
    noOptionsYet: string;
    currentHp: string;
    reset: string;
    defaultFullHp: string;
    usingCurrentHp: (value: number) => string;
    primaryControls: string;
    multipliers: string;
    attackerStageSummary: string;
    defenderStageSummary: string;
    speed: string;
    speedSummary: string;
    toggles: string;
    stats: string;
    battleEffects: string;
    abilities: string;
    resolveThisSideFirst: string;
    noAbilitySuggestions: string;
    global: string;
    weather: string;
    terrain: string;
    fieldEffects: string;
    attacker: string;
    defender: string;
  };
  combobox: {
    selectValue: string;
  };
  resultsPanel: {
    ariaLabel: string;
    minBulk: string;
    midBulk: string;
    maxBulk: string;
    copyResultText: (label: string) => string;
    copiedText: string;
    copyShareUrl: (label: string) => string;
    copiedUrl: string;
  };
}
