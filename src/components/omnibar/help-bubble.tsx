"use client";

import { useEffect, useRef, useState } from "react";

interface HotkeyRow {
  keys: string[];
  description: string;
}

interface SyntaxRow {
  token: string;
  description: string;
  example: string;
}

const HOTKEYS: HotkeyRow[] = [
  { keys: ["↑", "↓"], description: "Navigate autocomplete suggestions" },
  { keys: ["Tab"], description: "Accept suggestion / complete token" },
  { keys: ["Enter"], description: "Scroll to results (when ready)" },
  { keys: ["Shift", "Enter"], description: "Insert a line break" },
];

const SYNTAX_ROWS: SyntaxRow[] = [
  {
    token: "!move",
    description: "Attacker move",
    example: "!moonblast",
  },
  {
    token: "@item",
    description: "Attacker held item",
    example: "@choice-specs",
  },
  {
    token: ">modifier",
    description: "Attacker modifier (stage, nature, effect)",
    example: ">+1  >+nature",
  },
  {
    token: "<modifier",
    description: "Defender modifier (stage, nature, effect)",
    example: "<+nature  <reflect",
  },
  {
    token: "~effect",
    description: "Global weather / terrain / field",
    example: "~rain  ~trick-room",
  },
  {
    token: "%N",
    description: "Current HP percentage (1–100)",
    example: "%75  %50",
  },
  {
    token: "*",
    description: "Critical hit",
    example: "*",
  },
  {
    token: ">[Name]",
    description: "Attacker ability override",
    example: ">[Protosynthesis]",
  },
  {
    token: "<[Name]",
    description: "Defender ability override",
    example: "<[Vessel of Ruin]",
  },
];

const ATTACKER_MODIFIERS: Array<{ token: string; label: string }> = [
  { token: ">+1 … >+6", label: "Atk / SpA stage boost" },
  { token: ">-1 … >-6", label: "Atk / SpA stage drop" },
  { token: ">spe+1", label: "Speed stage boost" },
  { token: ">+nature", label: "Positive offensive nature" },
  { token: ">-nature", label: "Negative offensive nature" },
  { token: ">max-atk", label: "Max physical attack investment" },
  { token: ">max-spa", label: "Max special attack investment" },
  { token: ">helping-hand", label: "Helping Hand boost" },
  { token: ">tailwind", label: "Attacker has Tailwind" },
  { token: ">battery", label: "Battery boost" },
  { token: ">power-spot", label: "Power Spot boost" },
];

const DEFENDER_MODIFIERS: Array<{ token: string; label: string }> = [
  { token: "<+1 … <+6", label: "Def / SpD stage boost" },
  { token: "<+nature", label: "Positive defensive nature" },
  { token: "<-nature", label: "Negative defensive nature" },
  { token: "<max-def", label: "Max physical defense investment" },
  { token: "<max-spd", label: "Max special defense investment" },
  { token: "<reflect", label: "Reflect is up" },
  { token: "<light-screen", label: "Light Screen is up" },
  { token: "<aurora-veil", label: "Aurora Veil is up" },
  { token: "<protect", label: "Defender behind Protect" },
  { token: "<friend-guard", label: "Friend Guard active" },
  { token: "<tailwind", label: "Defender has Tailwind" },
];

const TIPS = [
  'Use "x" or "vs" to split attacker and defender.',
  "Modifiers can also be toggled via the panel below the input.",
  "The speed comparison token (~spe) is auto-suggested based on your Pokémon.",
  "Results show Min Bulk, Mid Bulk, and Max Bulk archetypes.",
  "Autocomplete works on Pokémon names, moves, and modifier tokens.",
  "Both a:token and >token prefixes are accepted for attacker modifiers.",
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className="theme-subpanel-strong inline-flex items-center justify-center rounded px-1.5 py-0.5 font-mono text-xs"
      style={{ minWidth: "1.5rem" }}
    >
      {children}
    </kbd>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-text-dim mb-3 text-xs font-semibold uppercase tracking-[0.24em]">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="theme-divider my-4 border-t" />;
}

export function HelpBubble() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label="Show syntax and hotkey reference"
        onClick={() => setOpen((prev) => !prev)}
        className={`theme-toggle-option flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${
          open ? "theme-toggle-option-active" : ""
        }`}
      >
        ?
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Syntax and hotkey reference"
          className="theme-panel scrollbar-none absolute right-0 top-full z-50 mt-2 max-h-[80vh] w-80 overflow-y-auto rounded-2xl p-4 text-left"
          style={{ boxShadow: "var(--shadow)" }}
        >
          {/* ── Hotkeys ── */}
          <section>
            <SectionHeading>Hotkeys</SectionHeading>
            <div className="space-y-2">
              {HOTKEYS.map(({ keys, description }) => (
                <div key={description} className="flex items-center gap-3">
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </div>
                  <span className="theme-text-muted text-sm">{description}</span>
                </div>
              ))}
            </div>
          </section>

          <Divider />

          {/* ── Syntax ── */}
          <section>
            <SectionHeading>Syntax</SectionHeading>

            <div className="theme-subpanel mb-3 rounded-xl px-3 py-2">
              <div className="theme-text-dim mb-1 text-[11px]">Structure</div>
              <div
                className="font-mono text-sm"
                style={{ color: "var(--text)" }}
              >
                attacker !move [tokens] x defender [tokens]
              </div>
            </div>

            <div className="space-y-2">
              {SYNTAX_ROWS.map(({ token, description, example }) => (
                <div key={token} className="flex items-start gap-2">
                  <code
                    className="theme-badge mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]"
                  >
                    {token}
                  </code>
                  <div className="min-w-0 flex-1">
                    <div className="theme-text-muted text-sm">{description}</div>
                    <div
                      className="font-mono text-[11px]"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {example}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Divider />

          {/* ── Attacker Modifiers ── */}
          <section>
            <SectionHeading>Attacker Modifiers (&gt;)</SectionHeading>
            <div className="space-y-1.5">
              {ATTACKER_MODIFIERS.map(({ token, label }) => (
                <div key={token} className="flex items-center gap-2">
                  <code
                    className="theme-subpanel-strong shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {token}
                  </code>
                  <span className="theme-text-muted text-sm">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <Divider />

          {/* ── Defender Modifiers ── */}
          <section>
            <SectionHeading>Defender Modifiers (&lt;)</SectionHeading>
            <div className="space-y-1.5">
              {DEFENDER_MODIFIERS.map(({ token, label }) => (
                <div key={token} className="flex items-center gap-2">
                  <code
                    className="theme-subpanel-strong shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {token}
                  </code>
                  <span className="theme-text-muted text-sm">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <Divider />

          {/* ── Tips ── */}
          <section>
            <SectionHeading>Tips</SectionHeading>
            <ul className="space-y-2">
              {TIPS.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 text-sm"
                >
                  <span
                    className="mt-1 shrink-0 text-[10px]"
                    style={{ color: "var(--accent)" }}
                    aria-hidden
                  >
                    ◆
                  </span>
                  <span className="theme-text-muted">{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
