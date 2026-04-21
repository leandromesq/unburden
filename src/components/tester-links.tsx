"use client";

import { useI18n } from "@/i18n/I18nProvider";

const discordInviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL?.trim();
const feedbackUrl = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim();

export function TesterLinks() {
  const { dictionary } = useI18n();

  if (!discordInviteUrl && !feedbackUrl) {
    return null;
  }

  return (
    <div className="theme-text-dim mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
      {discordInviteUrl ? (
        <a
          href={discordInviteUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          {dictionary.testerLinks.joinDiscord}
        </a>
      ) : null}
      {feedbackUrl ? (
        <a
          href={feedbackUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          {dictionary.testerLinks.giveFeedback}
        </a>
      ) : null}
    </div>
  );
}
