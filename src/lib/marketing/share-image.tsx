import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/seo";

const shareImageSize = {
  width: 1200,
  height: 630,
} as const;

const BG = "#141414";
const BG_ELEVATED = "#181818";
const SURFACE = "#1c1c1c";
const LINE = "rgba(255, 255, 255, 0.08)";
const LINE_STRONG = "rgba(255, 255, 255, 0.14)";
const TEXT = "#f3f3f1";
const TEXT_MUTED = "#cbc7bf";
const TEXT_DIM = "#a8a39a";
const TEXT_FAINT = "#7f7a72";

const DOMAIN = new URL(SITE_URL).host;
const PROMPT_PLACEHOLDER = "#gliscor !earthquake adamant x incineroar bold ~rain";
const APP_LOGO_SRC = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "src/app/unburden-logo.png"),
).toString("base64")}`;

export function generateShareImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: BG,
        color: TEXT,
        fontFamily: "IBM Plex Sans, ui-sans-serif, sans-serif",
        padding: 40,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRadius: 10,
          border: `1px solid ${LINE}`,
          background: BG_ELEVATED,
          padding: "36px 40px 38px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: 8,
                border: `1px solid ${LINE_STRONG}`,
                background: SURFACE,
                padding: 4,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse renders plain image elements. */}
              <img
                src={APP_LOGO_SRC}
                alt=""
                width="30"
                height="30"
                style={{
                  display: "flex",
                  width: 30,
                  height: 30,
                  objectFit: "contain",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                color: TEXT,
                fontSize: 30,
                lineHeight: 1,
                fontWeight: 600,
                letterSpacing: "-0.035em",
              }}
            >
              {SITE_NAME}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              color: TEXT_FAINT,
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            {DOMAIN}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
            marginTop: 56,
          }}
        >
          <div
            style={{
              display: "flex",
              maxWidth: 930,
              color: TEXT,
              fontSize: 72,
              lineHeight: 0.98,
              fontWeight: 700,
              letterSpacing: "-0.06em",
            }}
          >
            Fast Pokemon VGC damage calculation.
          </div>

          <div
            style={{
              display: "flex",
              maxWidth: 760,
              color: TEXT_MUTED,
              fontSize: 27,
              lineHeight: 1.25,
            }}
          >
            Build the calc from a prompt, then tune the matchup to your liking.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 58,
            borderRadius: 10,
            border: `1px solid ${LINE_STRONG}`,
            background: SURFACE,
            padding: "20px 22px 22px",
          }}
        >
          <div
            style={{
              display: "flex",
              color: TEXT_DIM,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Prompt
          </div>
          <div
            style={{
              display: "flex",
              minHeight: 92,
              alignItems: "center",
              borderRadius: 8,
              border: `1px solid ${LINE}`,
              background: BG,
              padding: "0 20px",
              color: TEXT_DIM,
              fontFamily: "IBM Plex Mono, ui-monospace, monospace",
              fontSize: 30,
              lineHeight: 1.3,
            }}
          >
            {PROMPT_PLACEHOLDER}
          </div>
        </div>
      </div>
    </div>,
    shareImageSize,
  );
}
