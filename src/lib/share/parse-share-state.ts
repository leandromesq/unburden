import {
	parseImportedSetSnapshot,
	parseSpeedBenchmarkShareState,
} from "@/lib/share/share-state-schema";
import type { ShareState } from "@/lib/types";

function decodeBase64Url(value: string) {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

	if (typeof Buffer !== "undefined") {
		return Buffer.from(padded, "base64").toString("utf-8");
	}

	const binary = atob(padded);
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

function parseRawShareState(encoded: string | null): ShareState | null {
	if (!encoded) {
		return null;
	}

	try {
		return JSON.parse(decodeBase64Url(encoded)) as ShareState;
	} catch {
		return null;
	}
}

export function parseShareState(encoded: string | null) {
	if (!encoded) {
		return [];
	}

	try {
		const parsed = parseRawShareState(encoded);

		if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.sets)) {
			return [];
		}

		return parsed.sets
			.map(parseImportedSetSnapshot)
			.filter((set) => set !== null);
	} catch {
		return [];
	}
}

export function parseSpeedShareState(encoded: string | null) {
	const parsed = parseRawShareState(encoded);

	if (!parsed || parsed.v !== 2 || parsed.page !== "speed") {
		return null;
	}

	return parseSpeedBenchmarkShareState(parsed.state);
}
