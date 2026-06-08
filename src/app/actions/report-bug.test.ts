import { reportBug } from "@/app/actions/report-bug";
import { resetBugReportAbuseGuard } from "@/lib/bug-report/abuse-guard";

jest.mock("next/headers", () => ({
  headers: jest.fn(async () => {
    const requestHeaders = new Headers();
    requestHeaders.set("x-forwarded-for", "127.0.0.1");
    requestHeaders.set("host", "localhost:3000");
    requestHeaders.set("origin", "http://localhost:3000");
    return requestHeaders;
  }),
}));

jest.mock("next/server", () => ({
  after: jest.fn((callback: () => void) => callback()),
}));

const initialReportBugState = {
  status: "idle" as const,
  message: "",
};

describe("reportBug", () => {
  const originalToken = process.env.GITHUB_BUG_REPORT_TOKEN;
  const originalRepo = process.env.GITHUB_BUG_REPORT_REPO;
  const originalFetch = global.fetch;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.GITHUB_BUG_REPORT_TOKEN = "github-token";
    process.env.GITHUB_BUG_REPORT_REPO = "leandromesq/unburden";
    resetBugReportAbuseGuard();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        number: 42,
        html_url: "https://github.com/leandromesq/unburden/issues/42",
      }),
    } as unknown as Response);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.GITHUB_BUG_REPORT_TOKEN = originalToken;
    process.env.GITHUB_BUG_REPORT_REPO = originalRepo;
    global.fetch = originalFetch;
    warnSpy.mockRestore();
  });

  test("rejects reports that are too short", async () => {
    const formData = new FormData();
    formData.set("description", "too short");
    formData.set("locale", "en");

    const result = await reportBug(initialReportBugState, formData);

    expect(result.status).toBe("error");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("swallows bot submissions that fill the honeypot field", async () => {
    const formData = new FormData();
    formData.set(
      "description",
      "Mega toggle flickers the summary sprite when I switch forms quickly.",
    );
    formData.set("teamName", "definitely-a-bot");
    formData.set("locale", "en");

    const result = await reportBug(initialReportBugState, formData);

    expect(result).toEqual({
      status: "success",
      message: "Bug report filed successfully.",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("creates a GitHub issue with the bug report context", async () => {
    const formData = new FormData();
    formData.set(
      "description",
      "Mega toggle flickers the summary sprite when I switch forms quickly.",
    );
    formData.set("prompt", "charizard-mega-y !heat-wave x tinkaton");
    formData.set("pageUrl", "https://unburdenvgc.com/");
    formData.set("userAgent", "Jest Browser");
    formData.set("locale", "en");

    const result = await reportBug(initialReportBugState, formData);

    expect(result).toEqual({
      status: "success",
      message: "Bug report filed as issue #42.",
      issueUrl: "https://github.com/leandromesq/unburden/issues/42",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/leandromesq/unburden/issues",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/vnd.github+json",
          Authorization: "Bearer github-token",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        }),
        cache: "no-store",
      }),
    );

    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        title: expect.stringContaining("[Bug report]"),
        body: expect.stringContaining("<!-- source: app-bug-report -->"),
      }),
    );
  });

  test("blocks rapid repeated submissions from the same source", async () => {
    const buildFormData = () => {
      const formData = new FormData();
      formData.set(
        "description",
        "Mega toggle flickers the summary sprite when I switch forms quickly.",
      );
      formData.set("prompt", `charizard-mega-y !heat-wave x tinkaton ${Math.random()}`);
      formData.set("locale", "en");
      return formData;
    };

    await reportBug(initialReportBugState, buildFormData());
    await reportBug(initialReportBugState, buildFormData());
    await reportBug(initialReportBugState, buildFormData());

    const blocked = await reportBug(initialReportBugState, buildFormData());

    expect(blocked.status).toBe("error");
    expect(blocked.message).toContain("Too many reports");
  });

  test("rejects a recent duplicate submission", async () => {
    const formData = new FormData();
    formData.set(
      "description",
      "Mega toggle flickers the summary sprite when I switch forms quickly.",
    );
    formData.set("prompt", "charizard-mega-y !heat-wave x tinkaton");
    formData.set("locale", "en");

    await reportBug(initialReportBugState, formData);
    const duplicate = await reportBug(initialReportBugState, formData);

    expect(duplicate).toEqual({
      status: "error",
      message: "That report looks like a recent duplicate.",
    });
  });
});
