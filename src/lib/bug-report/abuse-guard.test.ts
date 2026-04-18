import {
  consumeBugReportRateLimit,
  registerBugReportSignature,
  resetBugReportAbuseGuard,
} from "@/lib/bug-report/abuse-guard";

describe("bug report abuse guard", () => {
  beforeEach(() => {
    resetBugReportAbuseGuard();
  });

  test("allows only three bug reports per key inside the rate limit window", () => {
    const now = 1_000;

    expect(consumeBugReportRateLimit("ip:1", now).allowed).toBe(true);
    expect(consumeBugReportRateLimit("ip:1", now + 1).allowed).toBe(true);
    expect(consumeBugReportRateLimit("ip:1", now + 2).allowed).toBe(true);

    const blocked = consumeBugReportRateLimit("ip:1", now + 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  test("rejects duplicate signatures inside the duplicate window", () => {
    expect(registerBugReportSignature("same-report", 1_000).accepted).toBe(
      true,
    );
    expect(registerBugReportSignature("same-report", 1_500).accepted).toBe(
      false,
    );
    expect(
      registerBugReportSignature("same-report", 1_000 + 31 * 60 * 1000)
        .accepted,
    ).toBe(true);
  });
});
