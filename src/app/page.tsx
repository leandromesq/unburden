import { OmniComposer } from "@/components/omnibar/omni-composer";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { RegulationBadge } from "@/components/regulation-badge";

export default function Home() {
  return (
    <main className="theme-page relative min-h-screen overflow-hidden">
      <div className="theme-page-grid absolute inset-0 opacity-20" />
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          <div className="theme-kicker rounded-full px-4 py-1 text-xs uppercase tracking-[0.35em]">
            VGC Damage Calculator
          </div>
          <RegulationBadge />
          <ThemeToggle />
        </div>
        <h1 className="max-w-4xl font-sans text-5xl leading-none tracking-[-0.05em] md:text-7xl">
          Omniboost
        </h1>
        <p className="theme-text-muted mt-4 max-w-2xl text-base leading-7 md:text-lg">
          Type a matchup like a chat prompt. Accept suggestions using Arrow Keys
          and Tab. Compare Min, Mid, and Max bulk instantly.
        </p>
        <div className="mt-8 w-full">
          <OmniComposer />
        </div>
      </section>
    </main>
  );
}
