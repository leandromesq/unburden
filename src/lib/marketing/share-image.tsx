import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/seo";

const shareImageSize = {
  width: 1200,
  height: 630,
} as const;

// Warm charcoal surfaces — mirrors CSS custom property values
const BG            = "#141414";
const BG_ELEVATED   = "#181818";
const SURFACE       = "#1c1c1c";
const LINE          = "rgba(255, 255, 255, 0.08)";
const LINE_STRONG   = "rgba(255, 255, 255, 0.14)";
const TEXT          = "#f3f3f1";
const TEXT_MUTED    = "#cbc7bf";
const TEXT_DIM      = "#a8a39a";
const TEXT_FAINT    = "#7f7a72";
const BRASS         = "#d6a85f";   // --accent / Brass Signal

const DOMAIN = new URL(SITE_URL).host;
const PROMPT_PLACEHOLDER = "#gliscor !earthquake adamant x incineroar bold ~rain";
const APP_LOGO_SRC = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "src/app/unburden-logo.png"),
).toString("base64")}`;

export function generateShareImage() {
  return new ImageResponse(
    // Single flat surface — no outer frame wrapper, no nested prompt card.
    // BG_ELEVATED matches the product's main composer background.
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BG_ELEVATED,
        color: TEXT,
        fontFamily: "IBM Plex Sans, ui-sans-serif, sans-serif",
        padding: "44px 52px 48px",
      }}
    >
      {/* ── Header: logo + site name · domain ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 8,
              border: `1px solid ${LINE_STRONG}`,
              background: SURFACE,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse renders plain image elements. */}
            <img
              src={APP_LOGO_SRC}
              alt=""
              width="28"
              height="28"
              style={{ display: "flex", width: 28, height: 28, objectFit: "contain" }}
            />
          </div>
          <div
            style={{
              color: TEXT,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {SITE_NAME}
          </div>
        </div>

        <div style={{ color: TEXT_FAINT, fontSize: 17 }}>
          {DOMAIN}
        </div>
      </div>

      {/* ── Main copy ── */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: TEXT,
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 0.97,
            letterSpacing: "-0.045em",
            maxWidth: 920,
          }}
        >
          Fast Pokemon VGC damage calculation.
        </div>
        <div
          style={{
            color: TEXT_MUTED,
            fontSize: 25,
            lineHeight: 1.4,
            maxWidth: 700,
            marginTop: 18,
          }}
        >
          Build the calc from a prompt, then tune the matchup to your liking.
        </div>
      </div>

      {/* ── Prompt mock ── */}
      {/* No nested card — just the brass data-label + recessed input. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: BRASS,
            }}
          />
          <div
            style={{
              fontFamily: "IBM Plex Mono, ui-monospace, monospace",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.08em",
              color: BRASS,
            }}
          >
            PROMPT
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderRadius: 8,
            border: `1px solid ${LINE}`,
            background: BG,
            padding: "0 22px",
            minHeight: 80,
            fontFamily: "IBM Plex Mono, ui-monospace, monospace",
            fontSize: 28,
            lineHeight: 1.3,
            color: TEXT_DIM,
          }}
        >
          {PROMPT_PLACEHOLDER}
        </div>
      </div>
    </div>,
    shareImageSize,
  );
}
