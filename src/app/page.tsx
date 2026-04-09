import { OmniComposer } from "@/components/omnibar/omni-composer";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,#0a0c12_0%,#08090d_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-1 text-xs uppercase tracking-[0.35em] text-emerald-200/85">
          Gen 9 VGC doubles damage
        </div>
        <h1 className="max-w-4xl font-sans text-5xl leading-none tracking-[-0.05em] text-zinc-50 md:text-7xl">
          Omniboost
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">
          A fast VGC damage workspace with explicit symbolic grammar. Type the
          matchup like a chat prompt, accept token suggestions with Tab, and
          compare min, mid, and max bulk instantly.
        </p>
        <div className="mt-10 w-full">
          <OmniComposer />
        </div>
        <div className="mt-6 text-sm text-zinc-500">
          Example{" "}
          <span className="font-mono text-zinc-300">
            {"flutter mane !moonblast %75 * >+1 >+nature x ogerpon %50 <+nature ~rain"}
          </span>
        </div>
      </section>
    </main>
  );
}
