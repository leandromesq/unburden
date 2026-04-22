import { ImageResponse } from "next/og";

export const shareImageSize = {
  width: 1200,
  height: 630,
} as const;

export const shareImageContentType = "image/png";

export const shareImageAlt =
  "Unburden VGC share image with a blue tactical grid background and the tagline Fast VGC damage calculation in a chat-like composer.";

const PANEL_BORDER = "rgba(96, 165, 250, 0.28)";
const PANEL_FILL = "rgba(8, 14, 28, 0.86)";
const GRID_MINOR = "rgba(148, 163, 184, 0.10)";
const GRID_MAJOR = "rgba(96, 165, 250, 0.22)";
const TEXT_DIM = "#9fb0c7";
const TEXT_MUTED = "#cbd5e1";
const TEXT_BRIGHT = "#f8fbff";
const ACCENT = "#60a5fa";
const HERO_DESCRIPTION =
  "Type a matchup like a chat prompt. Accept suggestions with Tab. Compare Min, Mid, and Max bulk instantly.";
const PROMPT_EXAMPLE =
  "Kyogre !water-spout\n%100 x Rillaboom @assault-vest\n[Grassy Surge] sp:236/0/4/0/132/132";

function AccentChip({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 18px",
        borderRadius: 999,
        border: `1px solid ${PANEL_BORDER}`,
        background: "rgba(96, 165, 250, 0.10)",
        color: ACCENT,
        fontSize: 22,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}

function StatCard({
  eyebrow,
  value,
  description,
}: {
  eyebrow: string;
  value: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flex: 1,
        minWidth: 0,
        padding: "28px 28px 24px",
        borderRadius: 28,
        border: `1px solid ${PANEL_BORDER}`,
        background: "rgba(10, 18, 34, 0.92)",
      }}
    >
      <div
        style={{
          color: TEXT_DIM,
          fontSize: 16,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          marginTop: 18,
          color: TEXT_BRIGHT,
          fontSize: 48,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 14,
          color: TEXT_DIM,
          fontSize: 18,
          lineHeight: 1.45,
        }}
      >
        {description}
      </div>
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
          background:
            "radial-gradient(circle at 78% 16%, rgba(96, 165, 250, 0.26), transparent 28%), radial-gradient(circle at 12% 18%, rgba(14, 165, 233, 0.18), transparent 26%), linear-gradient(180deg, #0a0f1b 0%, #070b13 100%)",
          color: TEXT_BRIGHT,
          overflow: "hidden",
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
            backgroundSize: "40px 40px, 40px 40px, 160px 160px, 160px 160px",
            opacity: 0.92,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(6, 10, 18, 0.12) 0%, rgba(6, 10, 18, 0.42) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "52px 56px 46px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <AccentChip label="Unburden VGC" />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 16px",
                borderRadius: 999,
                border: `1px solid ${PANEL_BORDER}`,
                background: "rgba(7, 12, 22, 0.78)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: ACCENT,
                  boxShadow: "0 0 20px rgba(96, 165, 250, 0.75)",
                }}
              />
              <div
                style={{
                  color: TEXT_MUTED,
                  fontSize: 20,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Competitive Damage Workflow
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              maxWidth: 980,
            }}
          >
            <div
              style={{
                fontSize: 98,
                fontWeight: 700,
                letterSpacing: "-0.055em",
                lineHeight: 0.95,
              }}
            >
              Fast VGC damage calculation
            </div>
            <div
              style={{
                marginTop: 20,
                color: TEXT_MUTED,
                fontSize: 34,
                lineHeight: 1.3,
                maxWidth: 920,
              }}
            >
              {HERO_DESCRIPTION}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                width: 370,
                padding: "28px 30px",
                borderRadius: 32,
                border: `1px solid ${PANEL_BORDER}`,
                background: PANEL_FILL,
                boxShadow: "0 20px 48px rgba(0, 0, 0, 0.24)",
              }}
            >
              <div
                style={{
                  color: TEXT_DIM,
                  fontSize: 18,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Prompt Example
              </div>
              <div
                style={{
                  marginTop: 18,
                  color: TEXT_BRIGHT,
                  fontSize: 28,
                  lineHeight: 1.35,
                  whiteSpace: "pre-wrap",
                }}
              >
                {PROMPT_EXAMPLE}
              </div>
            </div>

            <StatCard
              eyebrow="Input Model"
              value="Chat-Like"
              description="Prompt grammar built for fast matchup iteration instead of long forms."
            />
            <StatCard
              eyebrow="Output Focus"
              value="Min / Mid / Max"
              description="Read ranges quickly and compare bulk assumptions without losing momentum."
            />
          </div>
        </div>
      </div>
    ),
    shareImageSize,
  );
}
