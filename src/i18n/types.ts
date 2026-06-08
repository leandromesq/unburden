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
		damage: string;
		about: string;
		speed: string;
		heroDescription: string;
		toggleModifiers: string;
		modifiers: string;
		swapSides: string;
		noIssues: string;
		resultsUpdated: string;
		resultsNotReady: string;
	};
	speedBenchmark: {
		title: string;
		description: string;
		commandLabel: string;
		commandPlaceholder: string;
		helpTrigger: string;
		helpTitle: string;
		helpDescription: string;
		helpClose: string;
		subject: string;
		comparator: string;
		benchmarkLadder: string;
		baselineLabel: string;
		globalModifiers: string;
		noPokemon: string;
		explicitComparator: string;
		nearestBenchmark: string;
		otherPokemon: (count: number) => string;
		speSp: string;
		stage: string;
		ability: string;
		nature: string;
		neutralNature: string;
		plusNature: string;
		minusNature: string;
		tailwind: string;
		choiceScarf: string;
		paralysis: string;
		trickRoom: string;
		sun: string;
		rain: string;
		sand: string;
		snow: string;
		electricTerrain: string;
		reset: string;
		copyShareUrl: string;
		copiedShareUrl: string;
		clear: string;
		pinComparator: string;
		unpinComparator: string;
		wheelSelection: string;
		swapSides: string;
		tiedTier: string;
		pinnedOffTier: string;
		thresholdEmpty: string;
		thresholdUnavailable: string;
		speedTie: string;
		movesFirst: string;
		comparatorMovesFirst: string;
		movesFirstTrickRoom: string;
		comparatorMovesFirstTrickRoom: string;
		pokemonMovesFirst: (name: string) => string;
		pokemonMovesFirstTrickRoom: (name: string) => string;
		pokemonSpeedTie: (left: string, right: string) => string;
		rawSpeed: string;
		effectiveSpeed: string;
		sequenceSubject: string;
		sequenceBenchmark: string;
		sequenceDecision: string;
		subjectFirst: string;
		benchmarkFirst: string;
		referenceTier: string;
		ladderContext: string;
		ladderContextModifiersOpen: string;
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
		license: string;
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
	summary: {
		resolvePokemon: string;
		resolveQuickSummary: (side: string) => string;
		import: string;
		export: string;
		copied: string;
		switch: string;
		save: string;
		edit: string;
		savedSets: string;
		removeSet: (name: string) => string;
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
		guaranteedOhko: string;
		ohkoRoll: string;
		guaranteedTwoHitPace: string;
		twoHitRoll: string;
		comfortableSurvive: string;
		chipDamage: string;
		koChance: string;
		damageRange: string;
		copyResultText: (label: string) => string;
		copiedText: string;
		copyShareUrl: (label: string) => string;
		copiedUrl: string;
	};
}
