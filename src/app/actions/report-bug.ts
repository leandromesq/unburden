"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";

import {
  consumeBugReportRateLimit,
  registerBugReportSignature,
} from "@/lib/bug-report/abuse-guard";
import { getDictionary } from "@/i18n/messages";
import { coerceLocale } from "@/i18n/locales";

interface ReportBugState {
  status: "idle" | "success" | "error";
  message: string;
  issueUrl?: string;
}

const APP_BUG_REPORT_MARKER = "<!-- source: app-bug-report -->";
const DEFAULT_GITHUB_BUG_REPORT_REPO = "leandromesq/unburden-issues";
const HONEYPOT_FIELD_NAME = "teamName";
const TRUSTED_ORIGIN_HOSTS: readonly string[] = [
  "localhost:3000",
  "127.0.0.1:3000",
  "unburden.app",
  "www.unburden.app",
];

function getClientAddressKey(headersList: Headers) {
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const forwardedHost = headersList.get("x-forwarded-host");

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    forwardedHost?.trim() ||
    "unknown";

  return `ip:${ip}`;
}

function readTrimmedString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function auth(headersList: Headers) {
  const origin = headersList.get("origin");
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");

  if (!origin || !host) {
    return { authorized: false };
  }

  try {
    const originUrl = new URL(origin);
    return {
      authorized:
        originUrl.host === host || TRUSTED_ORIGIN_HOSTS.includes(originUrl.host),
    };
  } catch {
    return { authorized: false };
  }
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function codeBlock(label: string, value: string) {
  if (!value) {
    return `### ${label}\n\nn/a`;
  }

  return `### ${label}\n\n\`\`\`\n${truncate(value, 1800)}\n\`\`\``;
}

function buildIssueTitle(description: string) {
  const firstLine = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return `[Bug report] ${truncate(firstLine ?? "User-submitted issue", 80)}`;
}

function buildIssueBody({
  description,
  pageUrl,
  prompt,
  userAgent,
}: {
  description: string;
  pageUrl: string;
  prompt: string;
  userAgent: string;
}) {
  return [
    APP_BUG_REPORT_MARKER,
    "",
    "User submitted this issue from the in-app reporter.",
    "",
    codeBlock("Description", description),
    "",
    codeBlock("Prompt", prompt),
    "",
    "### Context",
    "",
    `- Page: ${pageUrl || "n/a"}`,
    `- User agent: ${truncate(userAgent, 400) || "n/a"}`,
  ].join("\n");
}

function buildDuplicateSignature({
  description,
  pageUrl,
  prompt,
}: {
  description: string;
  pageUrl: string;
  prompt: string;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        description: description.toLowerCase(),
        pageUrl: pageUrl.toLowerCase(),
        prompt: prompt.toLowerCase(),
      }),
    )
    .digest("hex");
}

export async function reportBug(
  _prevState: ReportBugState,
  formData: FormData,
): Promise<ReportBugState> {
  const locale = coerceLocale(readTrimmedString(formData.get("locale")));
  const messages = getDictionary(locale).bugReport.server;
  const headersList = await headers();
  const session = await auth(headersList);
  const rateLimitKey = getClientAddressKey(headersList);

  if (!session.authorized) {
    after(() => {
      console.warn("Bug report rejected by untrusted origin.", { rateLimitKey });
    });

    return {
      status: "error",
      message: messages.unexpected,
    };
  }

  const token = process.env.GITHUB_BUG_REPORT_TOKEN?.trim();
  const repo =
    process.env.GITHUB_BUG_REPORT_REPO?.trim() ??
    DEFAULT_GITHUB_BUG_REPORT_REPO;

  if (!token || !repo) {
    return {
      status: "error",
      message: messages.notConfigured,
    };
  }

  const description = readTrimmedString(formData.get("description"));
  const prompt = readTrimmedString(formData.get("prompt"));
  const pageUrl = readTrimmedString(formData.get("pageUrl"));
  const userAgent = readTrimmedString(formData.get("userAgent"));
  const honeypotValue = readTrimmedString(formData.get(HONEYPOT_FIELD_NAME));

  if (description.length < 10) {
    return {
      status: "error",
      message: messages.tooShort,
    };
  }

  if (description.length > 4000) {
    return {
      status: "error",
      message: messages.tooLong,
    };
  }

  if (honeypotValue) {
    after(() => {
      console.warn("Bug report rejected by honeypot.", {
        rateLimitKey,
        pageUrl,
      });
    });
    return {
      status: "success",
      message: messages.honeypotSuccess,
    };
  }

  const rateLimit = consumeBugReportRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    const retryAfterMinutes = Math.max(
      1,
      Math.ceil(rateLimit.retryAfterMs / 60_000),
    );

    after(() => {
      console.warn("Bug report rate limited.", {
        rateLimitKey,
        retryAfterMs: rateLimit.retryAfterMs,
      });
    });

    return {
      status: "error",
      message: messages.rateLimit(retryAfterMinutes),
    };
  }

  const duplicateSignature = buildDuplicateSignature({
    description,
    pageUrl,
    prompt,
  });
  const duplicateCheck = registerBugReportSignature(duplicateSignature);
  if (!duplicateCheck.accepted) {
    return {
      status: "error",
      message: messages.duplicate,
    };
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: buildIssueTitle(description),
        body: buildIssueBody({
          description,
          prompt,
          pageUrl,
          userAgent,
        }),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = truncate(await response.text(), 500);
      console.error("GitHub issue creation failed.", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      return {
        status: "error",
        message:
          response.status === 401 || response.status === 403
            ? messages.misconfigured
            : messages.createFailed,
      };
    }

    const issue = (await response.json()) as {
      html_url?: string;
      number?: number;
    };

    return {
      status: "success",
      message: issue.number
        ? messages.filedWithNumber(issue.number)
        : messages.filedSuccess,
      issueUrl: issue.html_url,
    };
  } catch {
    console.error("GitHub issue creation threw an unexpected error.");
    return {
      status: "error",
      message: messages.unexpected,
    };
  }
}
