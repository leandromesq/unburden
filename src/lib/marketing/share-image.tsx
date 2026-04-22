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
const BG_BOTTOM = "#070b13";
const SURFACE = "rgba(15, 22, 36, 0.94)";
const SURFACE_TOP = "rgba(19, 28, 45, 0.96)";
const LINE = "rgba(255, 255, 255, 0.08)";
const LINE_STRONG = "rgba(96, 165, 250, 0.28)";
const GRID_MINOR = "rgba(255, 255, 255, 0.045)";
const GRID_MAJOR = "rgba(96, 165, 250, 0.12)";
const ACCENT = "#60a5fa";
const ACCENT_SOFT = "rgba(96, 165, 250, 0.12)";
const TEXT = "#f8fbff";
const TEXT_MUTED = "#c7d2e3";
const TEXT_DIM = "#8ea2bc";

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
        background: `radial-gradient(circle at 82% 14%, rgba(96, 165, 250, 0.18), transparent 26%), radial-gradient(circle at 14% 18%, rgba(14, 165, 233, 0.10), transparent 24%), linear-gradient(180deg, ${BG_TOP} 0%, ${BG_BOTTOM} 100%)`,
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
          opacity: 0.88,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(180deg, rgba(4, 8, 14, 0.05) 0%, rgba(4, 8, 14, 0.36) 100%)",
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
          padding: "54px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1020,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "38px 42px 40px",
            borderRadius: 36,
            border: `1px solid ${LINE_STRONG}`,
            background: `linear-gradient(180deg, ${SURFACE_TOP} 0%, ${SURFACE} 100%)`,
            boxShadow: "0 22px 60px rgba(0, 0, 0, 0.28)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 18px",
                borderRadius: 999,
                border: `1px solid ${LINE_STRONG}`,
                background: ACCENT_SOFT,
                color: ACCENT,
                fontSize: 22,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              VGC Damage Calculator
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: TEXT_DIM,
                fontSize: 18,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {DOMAIN}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              marginTop: 34,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 110,
                lineHeight: 0.92,
                letterSpacing: "-0.06em",
                fontWeight: 700,
                color: TEXT,
              }}
            >
              {TITLE}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 24,
                maxWidth: 860,
                color: TEXT_MUTED,
                fontSize: 33,
                lineHeight: 1.32,
              }}
            >
              {SUBTITLE}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              marginTop: 34,
              borderRadius: 28,
              border: `1px solid ${LINE}`,
              background: "rgba(9, 15, 26, 0.92)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "16px 22px",
                borderBottom: `1px solid ${LINE}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: TEXT_DIM,
                  fontSize: 18,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Composer
              </div>
              <div
                style={{
                  display: "flex",
                  color: ACCENT,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Fast. Focused. VGC.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                width: "100%",
                padding: "24px 26px 26px",
                color: TEXT,
                fontSize: 28,
                lineHeight: 1.35,
              }}
            >
              incineroar !flare-blitz x kingambit @occaberry [Defiant]
            </div>
          </div>
        </div>
      </div>
    </div>,
    shareImageSize,
  );
}
