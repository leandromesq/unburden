import { ImageResponse } from "next/og";

export const shareImageSize = {
  width: 1200,
  height: 630,
} as const;

export const shareImageContentType = "image/png";

export const shareImageAlt =
  "Unburden VGC share image with a tactical blue grid background and a composer-style panel for fast VGC damage calculation.";

const BG_TOP = "#0b101a";
const BG_BOTTOM = "#070b13";
const SURFACE = "rgba(11, 18, 30, 0.92)";
const SURFACE_STRONG = "rgba(8, 14, 24, 0.96)";
const LINE = "rgba(255, 255, 255, 0.08)";
const LINE_STRONG = "rgba(96, 165, 250, 0.28)";
const GRID_MINOR = "rgba(255, 255, 255, 0.05)";
const GRID_MAJOR = "rgba(96, 165, 250, 0.14)";
const ACCENT = "#60a5fa";
const ACCENT_SOFT = "rgba(96, 165, 250, 0.12)";
const TEXT = "#f8fbff";
const TEXT_MUTED = "#c7d2e3";
const TEXT_DIM = "#8ea2bc";

const HERO_COPY =
  "Type a matchup like a chat prompt. Accept suggestions with Tab and compare Min, Mid, and Max bulk instantly.";
const PROMPT_EXAMPLE =
  "Kyogre !water-spout x Rillaboom @assault-vest [Grassy Surge]";

function Pill({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 18px",
        borderRadius: 999,
        border: `1px solid ${active ? LINE_STRONG : LINE}`,
        background: active ? ACCENT_SOFT : "rgba(255, 255, 255, 0.03)",
        color: active ? ACCENT : TEXT_MUTED,
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: active ? "0.14em" : "0",
        textTransform: active ? "uppercase" : "none",
      }}
    >
      {label}
    </div>
  );
}

export function generateShareImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: TEXT,
          background: `radial-gradient(circle at 82% 14%, rgba(96, 165, 250, 0.22), transparent 26%), radial-gradient(circle at 14% 18%, rgba(14, 165, 233, 0.12), transparent 24%), linear-gradient(180deg, ${BG_TOP} 0%, ${BG_BOTTOM} 100%)`,
          fontFamily:
            "Inter, Space Grotesk, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: `
              linear-gradient(${GRID_MINOR} 1px, transparent 1px),
              linear-gradient(90deg, ${GRID_MINOR} 1px, transparent 1px),
              linear-gradient(${GRID_MAJOR} 1px, transparent 1px),
              linear-gradient(90deg, ${GRID_MAJOR} 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px, 44px 44px, 176px 176px, 176px 176px",
            opacity: 0.9,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(4, 8, 14, 0.04) 0%, rgba(4, 8, 14, 0.42) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            padding: "54px",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "38px 40px 34px",
              borderRadius: 36,
              border: `1px solid ${LINE_STRONG}`,
              background: SURFACE,
              boxShadow: "0 22px 60px rgba(0, 0, 0, 0.28)",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Pill label="Unburden VGC" active />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: TEXT_DIM,
                  fontSize: 20,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Chat-like damage workflow
              </div>
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                marginTop: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: TEXT,
                  fontSize: 92,
                  lineHeight: 0.94,
                  letterSpacing: "-0.055em",
                  fontWeight: 700,
                  maxWidth: 920,
                }}
              >
                Fast VGC damage calculation
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 20,
                  maxWidth: 920,
                  color: TEXT_MUTED,
                  fontSize: 31,
                  lineHeight: 1.32,
                }}
              >
                {HERO_COPY}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 30,
                  border: `1px solid ${LINE}`,
                  background: SURFACE_STRONG,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 22px",
                    borderBottom: `1px solid ${LINE}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      color: TEXT_DIM,
                      fontSize: 18,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    Composer
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      color: ACCENT,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    No issues.
                  </div>
                </div>

                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    padding: "24px 26px 28px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      color: TEXT,
                      fontSize: 29,
                      lineHeight: 1.35,
                    }}
                  >
                    {PROMPT_EXAMPLE}
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: "100%",
                  display: "flex",
                  gap: 14,
                }}
              >
                <Pill label="Tab autocomplete" />
                <Pill label="Min / Mid / Max bulk" />
                <Pill label="VGC focused" />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    shareImageSize,
  );
}
