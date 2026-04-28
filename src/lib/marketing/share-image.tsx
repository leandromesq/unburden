import { ImageResponse } from "next/og";
import {
  SITE_NAME,
  SITE_SHARE_IMAGE_ALT,
  SITE_URL,
} from "@/lib/marketing/seo";

export const shareImageSize = {
  width: 1200,
  height: 630,
} as const;

export const shareImageContentType = "image/png";

export const shareImageAlt = SITE_SHARE_IMAGE_ALT;

const BG = "#141414";
const BG_ELEVATED = "#181818";
const SURFACE = "#1c1c1c";
const SURFACE_2 = "#232323";
const SURFACE_3 = "#2b2b2b";
const LINE = "rgba(255, 255, 255, 0.08)";
const LINE_STRONG = "rgba(255, 255, 255, 0.14)";
const ACCENT = "#d6a85f";
const ACCENT_STRONG = "#e3bf81";
const ACCENT_SOFT = "rgba(214, 168, 95, 0.14)";
const TEXT = "#f3f3f1";
const TEXT_MUTED = "#cbc7bf";
const TEXT_DIM = "#a8a39a";
const SUCCESS = "#6e9b7f";

const DOMAIN = new URL(SITE_URL).host;

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
        padding: 36,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: 10,
          border: `1px solid ${LINE}`,
          background: BG_ELEVATED,
          padding: "28px 30px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 24,
            borderBottom: `1px solid ${LINE}`,
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
                background: SURFACE_2,
                color: ACCENT_STRONG,
                fontSize: 23,
                fontWeight: 700,
                letterSpacing: "-0.06em",
              }}
            >
              U
            </div>
            <div
              style={{
                display: "flex",
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
              color: TEXT_DIM,
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
            flex: 1,
            paddingTop: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              maxWidth: 900,
              fontSize: 66,
              lineHeight: 0.96,
              fontWeight: 700,
              letterSpacing: "-0.06em",
            }}
          >
            Damage calcs that stay readable.
          </div>

          <div
            style={{
              display: "flex",
              color: TEXT_MUTED,
              maxWidth: 760,
              fontSize: 27,
              lineHeight: 1.25,
            }}
          >
            Type a calc, adjust the summary, and keep every modifier visible in
            the prompt.
          </div>

          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                borderRadius: 10,
                border: `1px solid ${LINE_STRONG}`,
                background: SURFACE,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderBottom: `1px solid ${LINE}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: TEXT_DIM,
                    fontSize: 17,
                    fontWeight: 600,
                  }}
                >
                  Prompt
                </div>
                <div
                  style={{
                    display: "flex",
                    color: ACCENT_STRONG,
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  suggestions ready
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: "22px 18px 24px",
                  fontFamily: "IBM Plex Mono, ui-monospace, monospace",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: TEXT,
                    fontSize: 27,
                    lineHeight: 1.35,
                  }}
                >
                  incineroar !flare-blitz x gholdengo
                </div>
                <div
                  style={{
                    display: "flex",
                    color: TEXT_DIM,
                    fontSize: 21,
                    lineHeight: 1.25,
                  }}
                >
                  ~sun atk+1 %75
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 360,
                borderRadius: 10,
                border: `1px solid ${LINE_STRONG}`,
                background: SURFACE,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderBottom: `1px solid ${LINE}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: TEXT_DIM,
                    fontSize: 17,
                    fontWeight: 600,
                  }}
                >
                  Calc
                </div>
                <div
                  style={{
                    display: "flex",
                    color: SUCCESS,
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  2HKO
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  padding: "20px 16px 21px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: TEXT,
                    fontSize: 42,
                    lineHeight: 1,
                    fontWeight: 700,
                    letterSpacing: "-0.045em",
                  }}
                >
                  64.8 - 78.1%
                </div>
                <div
                  style={{
                    display: "flex",
                    height: 12,
                    borderRadius: 6,
                    overflow: "hidden",
                    background: SURFACE_3,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: "72%",
                      background: ACCENT,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    color: TEXT_DIM,
                    fontSize: 17,
                    lineHeight: 1.25,
                  }}
                >
                  16 rolls, summary edits reflected in prompt.
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 6,
            }}
          >
            {["Prompt-first", "Saved sets", "Battle modifiers"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: `1px solid ${LINE}`,
                  background: label === "Prompt-first" ? ACCENT_SOFT : SURFACE,
                  color: label === "Prompt-first" ? ACCENT_STRONG : TEXT_DIM,
                  fontSize: 17,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    shareImageSize,
  );
}
