"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { getAboutContent } from "@/i18n/messages";

const discordInviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL?.trim();
const feedbackUrl = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim();
const donateUrl = process.env.NEXT_PUBLIC_DONATE_URL?.trim();

function AboutWorkflowPanel({
  workflow,
}: {
  workflow: ReturnType<typeof getAboutContent>["workflow"];
}) {
  return (
    <aside
      className="theme-about-workflow rounded-2xl px-4 py-3 sm:px-5 sm:py-4"
      aria-label={workflow.eyebrow}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="theme-data-label">{workflow.eyebrow}</div>
        <div className="theme-about-live-pill rounded-full px-2.5 py-1 font-mono text-[11px]">
          {workflow.badge}
        </div>
      </div>
      <ol className="divide-y divide-[var(--line)]">
        {workflow.steps.map((step, index) => (
          <li
            key={step.title}
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="theme-about-step-number flex h-8 w-8 items-center justify-center rounded-md font-mono text-[11px] tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{step.title}</div>
              <p className="theme-text-dim mt-1 text-sm leading-6">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function AboutSection() {
  const { locale, dictionary } = useI18n();
  const aboutContent = getAboutContent(locale);
  const supportLinks = [
    feedbackUrl
      ? {
          label: dictionary.aboutSection.feedback,
          href: feedbackUrl,
          emphasized: false,
        }
      : null,
    discordInviteUrl
      ? {
          label: dictionary.aboutSection.discord,
          href: discordInviteUrl,
          emphasized: false,
        }
      : null,
    donateUrl
      ? {
          label: dictionary.aboutSection.donate,
          href: donateUrl,
          emphasized: true,
        }
      : null,
  ].filter(
    (
      link,
    ): link is {
      label: string;
      href: string;
      emphasized: boolean;
    } => link !== null,
  );

  return (
    <section aria-labelledby="about-title" className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:items-end">
        <div className="max-w-3xl">
          <div className="theme-data-label mb-3">
            {aboutContent.intro.eyebrow}
          </div>
          <h2
            id="about-title"
            className="text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl"
          >
            {aboutContent.intro.title}
          </h2>
          <p className="theme-text-dim mt-4 max-w-[68ch] text-sm leading-7 sm:text-base sm:leading-8">
            {aboutContent.intro.description}
          </p>
        </div>
        <AboutWorkflowPanel workflow={aboutContent.workflow} />
      </div>

      <h3 className="sr-only">{dictionary.aboutSection.highlight}</h3>
      <div className="theme-about-highlights grid gap-0 overflow-hidden rounded-xl border border-[var(--line)] sm:grid-cols-3">
        {aboutContent.intro.highlights.map((highlight, index) => (
          <div
            key={highlight}
            className="min-w-0 border-b border-[var(--line)] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <div className="theme-data-label mb-3 tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </div>
            <p className="text-sm leading-6">{highlight}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        {aboutContent.cards.map((card, index) => (
          <article
            key={card.title}
            className={`theme-panel flex h-full flex-col rounded-xl p-5 ${index === 2 ? "lg:col-span-2" : ""}`}
          >
            <div className="theme-data-label mb-2">{card.eyebrow}</div>
            <h3 className="text-lg font-semibold tracking-[-0.02em]">
              {card.title}
            </h3>
            <p className="theme-text-dim mt-2 text-sm leading-6">
              {card.description}
            </p>

            <ul className="theme-text-dim mt-4 grid gap-2 text-sm leading-6 sm:grid-cols-2 lg:grid-cols-1">
              {card.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="theme-about-bullet min-w-0 rounded-lg px-3 py-2"
                >
                  {bullet}
                </li>
              ))}
            </ul>

            {card.links?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {card.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="theme-icon-button inline-flex h-8 items-center rounded-lg px-3 text-sm"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <section
        aria-labelledby="about-data-sources-title"
        className="theme-panel rounded-xl p-5"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div>
            <div className="theme-data-label mb-2">
              {aboutContent.dataSources.eyebrow}
            </div>
            <h3
              id="about-data-sources-title"
              className="text-lg font-semibold tracking-[-0.02em]"
            >
              {aboutContent.dataSources.title}
            </h3>
            <p className="theme-text-dim mt-2 text-sm leading-6">
              {aboutContent.dataSources.description}
            </p>
          </div>

          <div className="border-t border-[var(--line)] pt-4 lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0">
            <ul className="theme-text-dim space-y-2 text-sm leading-6">
              {aboutContent.dataSources.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            {aboutContent.dataSources.links?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {aboutContent.dataSources.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="theme-icon-button inline-flex h-8 items-center rounded-lg px-3 text-sm"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="about-support-title"
        className="theme-panel rounded-xl p-5"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div>
            <div className="theme-data-label mb-2">
              {aboutContent.support.eyebrow}
            </div>
            <h3
              id="about-support-title"
              className="text-lg font-semibold tracking-[-0.02em]"
            >
              {aboutContent.support.title}
            </h3>
            <p className="theme-text-dim mt-2 text-sm leading-6">
              {aboutContent.support.description}
            </p>
            <ul className="theme-text-dim mt-4 space-y-2 text-sm leading-6">
              {aboutContent.support.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[var(--line)] pt-4 lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0">
            <div className="theme-text-dim text-sm leading-6">
              {dictionary.aboutSection.actionsDescription}
            </div>
            {supportLinks.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {supportLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex h-8 items-center rounded-lg px-3 text-sm ${
                      link.emphasized
                        ? "theme-chip-active"
                        : "theme-icon-button"
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : (
              <p className="theme-text-faint mt-4 text-sm leading-6">
                {dictionary.aboutSection.emptyActions}
              </p>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
