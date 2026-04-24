import { ImageResponse } from "next/og";
import {
  SITE_NAME,
  SITE_SHARE_IMAGE_ALT,
  SITE_SHARE_IMAGE_SUBTITLE,
  SITE_URL,
} from "@/lib/marketing/seo";

export const shareImageSize = {
  width: 1200,
  height: 630,
} as const;

export const shareImageContentType = "image/png";

export const shareImageAlt = SITE_SHARE_IMAGE_ALT;

const BG_TOP = "#0b101a";
const BG_BOTTOM = "#11161d";
const SURFACE = "#171c23";
const SURFACE_MUTED = "#1d232b";
const SURFACE_SOFT = "#202730";
const LINE = "rgba(255, 255, 255, 0.08)";
const LINE_STRONG = "rgba(255, 255, 255, 0.14)";
const ACCENT = "#78a0f5";
const ACCENT_SOFT = "rgba(79, 126, 232, 0.14)";
const TEXT = "#f8fbff";
const TEXT_MUTED = "#c1c6cf";
const TEXT_DIM = "#8d96a4";
const TEXT_FAINT = "#6f7886";

const TITLE = SITE_NAME;
const SUBTITLE = SITE_SHARE_IMAGE_SUBTITLE;
const DOMAIN = new URL(SITE_URL).host;

export function generateShareImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        color: TEXT,
        background: `linear-gradient(180deg, ${BG_TOP} 0%, ${BG_BOTTOM} 100%)`,
        fontFamily: "Space Grotesk, ui-sans-serif, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 24%)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1080,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "26px 28px 28px",
            borderRadius: 12,
            border: `1px solid ${LINE}`,
            background: SURFACE,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              paddingBottom: "18px",
              borderBottom: `1px solid ${LINE}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "12px",
                  height: "12px",
                  borderRadius: "999px",
                  background: ACCENT,
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                }}
              >
                {TITLE}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
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
              flexDirection: "row",
              gap: "24px",
              width: "100%",
              flex: 1,
              marginTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                width: "62%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 72,
                    lineHeight: 1,
                    letterSpacing: "-0.055em",
                    fontWeight: 700,
                    color: TEXT,
                  }}
                >
                  VGC damage
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 72,
                    lineHeight: 1,
                    letterSpacing: "-0.055em",
                    fontWeight: 700,
                    color: TEXT,
                  }}
                >
                  without the clutter
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 24,
                    maxWidth: 560,
                    color: TEXT_MUTED,
                    fontSize: 28,
                    lineHeight: 1.35,
                  }}
                >
                  {SUBTITLE}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  color: TEXT_FAINT,
                  fontSize: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${LINE}`,
                    background: SURFACE_MUTED,
                    color: TEXT_MUTED,
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  Tool-first UI
                </div>
                <div style={{ display: "flex" }}>
                  Prompt, summaries, modifiers, results.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "38%",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 10,
                  border: `1px solid ${LINE}`,
                  background: SURFACE_MUTED,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderBottom: `1px solid ${LINE}`,
                    color: TEXT_DIM,
                    fontSize: 16,
                  }}
                >
                  <div style={{ display: "flex", fontWeight: 500 }}>
                    Composer
                  </div>
                  <div
                    style={{
                      display: "flex",
                      padding: "4px 8px",
                      borderRadius: 8,
                      background: ACCENT_SOFT,
                      color: ACCENT,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Ready
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    padding: "16px 14px",
                    color: TEXT,
                    fontSize: 24,
                    lineHeight: 1.35,
                  }}
                >
                  incineroar !flare-blitz x kingambit @occaberry [Defiant]
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {[
                  ["Summaries", "Inline set editing"],
                  ["Modifiers", "Global and side controls"],
                  ["Results", "Fast bulk reads and sharing"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 10,
                      border: `1px solid ${LINE}`,
                      background: SURFACE_SOFT,
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        color: TEXT_DIM,
                        fontSize: 16,
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        color: TEXT,
                        fontSize: 16,
                        fontWeight: 500,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    shareImageSize,
  );
}
