"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { getAboutContent } from "@/i18n/messages";

const discordInviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL?.trim();
const feedbackUrl = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim();
const donateUrl = process.env.NEXT_PUBLIC_DONATE_URL?.trim();

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
    <section
      id="about"
      aria-labelledby="about-title"
      className="relative z-10 mx-auto mt-8 w-full max-w-7xl scroll-mt-8 px-6 pb-16 md:mt-12 md:pb-24"
    >
      <div className="theme-panel overflow-hidden rounded-[2rem]">
        <div
          className="grid gap-6 px-6 py-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div className="max-w-3xl text-left">
            <div className="theme-text-faint text-[11px] font-semibold uppercase tracking-[0.28em]">
              {aboutContent.intro.eyebrow}
            </div>
            <h2
              id="about-title"
              className="mt-3 max-w-3xl text-3xl leading-tight tracking-[-0.04em] md:text-4xl"
            >
              {aboutContent.intro.title}
            </h2>
            <p className="theme-text-muted mt-4 max-w-2xl text-sm leading-7 md:text-base">
              {aboutContent.intro.description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {aboutContent.intro.highlights.map((highlight) => (
              <div
                key={highlight}
                className="theme-subpanel rounded-[1.4rem] px-4 py-4 text-left"
              >
                <div className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.22em]">
                  {dictionary.aboutSection.highlight}
                </div>
                <div className="mt-2 text-sm font-medium leading-6">
                  {highlight}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 md:px-8 md:py-8 xl:grid-cols-3">
          {aboutContent.cards.map((card) => (
            <article
              key={card.title}
              className="theme-subpanel flex h-full flex-col rounded-[1.6rem] p-5 md:p-6"
            >
              <div className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.24em]">
                {card.eyebrow}
              </div>
              <h3 className="mt-3 text-xl leading-tight tracking-[-0.03em]">
                {card.title}
              </h3>
              <p className="theme-text-muted mt-3 text-sm leading-7">
                {card.description}
              </p>

              <ul className="mt-5 space-y-3 text-sm leading-6">
                {card.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="theme-text-dim border-l pl-3"
                    style={{ borderColor: "var(--accent-border)" }}
                  >
                    {bullet}
                  </li>
                ))}
              </ul>

              {card.links?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {card.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="theme-chip inline-flex rounded-full px-4 py-2 text-sm"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="px-6 pb-6 md:px-8 md:pb-8">
          <div
            className="rounded-[1.8rem] px-5 py-5 md:px-6 md:py-6"
            style={{
              border: "1px solid var(--accent-border)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--accent-softer) 72%, var(--surface-2)) 0%, var(--surface-2) 100%)",
            }}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-start">
              <div className="text-left">
                <div className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.24em]">
                  {aboutContent.support.eyebrow}
                </div>
                <h3 className="mt-3 text-2xl leading-tight tracking-[-0.03em]">
                  {aboutContent.support.title}
                </h3>
                <p className="theme-text-muted mt-3 max-w-2xl text-sm leading-7">
                  {aboutContent.support.description}
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6">
                  {aboutContent.support.notes.map((note) => (
                    <li
                      key={note}
                      className="theme-text-dim border-l pl-3"
                      style={{ borderColor: "var(--accent-border)" }}
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="theme-subpanel rounded-[1.5rem] p-4 text-left md:p-5">
                <div className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.22em]">
                  {dictionary.aboutSection.actions}
                </div>
                <p className="theme-text-dim mt-2 text-sm leading-6">
                  {dictionary.aboutSection.actionsDescription}
                </p>
                {supportLinks.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {supportLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
                          link.emphasized ? "theme-chip-active" : "theme-chip"
                        }`}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="theme-text-faint mt-4 text-xs leading-6">
                    {dictionary.aboutSection.emptyActions}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
