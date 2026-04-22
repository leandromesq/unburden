const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 3;
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

type AttemptLog = number[];

interface AbuseGuardStore {
  attemptsByKey: Map<string, AttemptLog>;
  duplicatesBySignature: Map<string, number>;
}

function getStore(): AbuseGuardStore {
  const globalKey = "__unburdenBugReportAbuseGuard";
  const legacyGlobalKey = "__omniboostBugReportAbuseGuard";
  const globalStore = globalThis as typeof globalThis & {
    [globalKey]?: AbuseGuardStore;
    [legacyGlobalKey]?: AbuseGuardStore;
  };

  if (!globalStore[globalKey] && globalStore[legacyGlobalKey]) {
    globalStore[globalKey] = globalStore[legacyGlobalKey];
    delete globalStore[legacyGlobalKey];
  }

  if (!globalStore[globalKey]) {
    globalStore[globalKey] = {
      attemptsByKey: new Map<string, AttemptLog>(),
      duplicatesBySignature: new Map<string, number>(),
    };
  }

  return globalStore[globalKey];
}

function pruneAttempts(attempts: AttemptLog, now: number) {
  return attempts.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
}

function pruneDuplicates(
  duplicatesBySignature: Map<string, number>,
  now: number,
) {
  for (const [signature, timestamp] of duplicatesBySignature.entries()) {
    if (now - timestamp >= DUPLICATE_WINDOW_MS) {
      duplicatesBySignature.delete(signature);
    }
  }
}

export function consumeBugReportRateLimit(key: string, now = Date.now()) {
  const normalizedKey = key.trim().toLowerCase();
  const store = getStore();
  const attempts = pruneAttempts(
    store.attemptsByKey.get(normalizedKey) ?? [],
    now,
  );

  if (attempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    store.attemptsByKey.set(normalizedKey, attempts);
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - attempts[0]);

    return {
      allowed: false as const,
      retryAfterMs,
    };
  }

  attempts.push(now);
  store.attemptsByKey.set(normalizedKey, attempts);

  return {
    allowed: true as const,
    retryAfterMs: 0,
  };
}

export function registerBugReportSignature(
  signature: string,
  now = Date.now(),
) {
  const normalizedSignature = signature.trim();
  const store = getStore();
  pruneDuplicates(store.duplicatesBySignature, now);

  if (store.duplicatesBySignature.has(normalizedSignature)) {
    return {
      accepted: false as const,
    };
  }

  store.duplicatesBySignature.set(normalizedSignature, now);

  return {
    accepted: true as const,
  };
}

export function resetBugReportAbuseGuard() {
  const store = getStore();
  store.attemptsByKey.clear();
  store.duplicatesBySignature.clear();
}
