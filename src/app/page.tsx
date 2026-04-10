import { OmniComposer } from "@/components/omnibar/omni-composer";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function Home() {
  return (
    <main className="theme-page relative min-h-screen overflow-hidden">
      <div className="theme-page-grid absolute inset-0 opacity-30" />
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="theme-kicker mb-6 rounded-full px-4 py-1 text-xs uppercase tracking-[0.35em]">
          VGC Damage Calculator
        </div>
        <h1 className="max-w-4xl font-sans text-5xl leading-none tracking-[-0.05em] md:text-7xl">
          Omniboost
        </h1>
        <p className="theme-text-muted mt-5 max-w-3xl text-base leading-7 md:text-lg">
          A fast VGC damage workspace with explicit symbolic grammar for on the
          fly calculations. Type the matchup like a chat prompt, accept token
          suggestions with arrow keys and Tab, and compare min, mid, and max
          bulk instantly.
        </p>
        <div className="mt-10 w-full">
          <OmniComposer />
        </div>
        <div className="theme-text-dim mt-6 text-sm">
          Example{" "}
          <span className="theme-inline-code font-mono">
            {
              "flutter mane !moonblast %75 * >+1 >+nature x ogerpon %50 <+nature ~rain"
            }
          </span>
        </div>
      </section>
    </main>
  );
}
