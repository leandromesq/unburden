import { ImageResponse } from "next/og";
import {
  SITE_NAME,
  SITE_SHARE_IMAGE_ALT,
  SITE_SHARE_IMAGE_SUBTITLE,
  SITE_SHORT_NAME,
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
const TEXT_FAINT = "#7f7a72";
const CATEGORY_PHYSICAL = "#9c6958";
const CATEGORY_SPECIAL = "#6c8394";
const SUCCESS = "#6e9b7f";

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
        background: BG,
        fontFamily: "IBM Plex Sans, ui-sans-serif, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0) 36%)",
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
          padding: "34px",
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
            padding: "22px 24px 24px",
            borderRadius: 10,
            border: `1px solid ${LINE}`,
            background: BG_ELEVATED,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              paddingBottom: "16px",
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
                  alignItems: "center",
                  justifyContent: "center",
                  width: "38px",
                  height: "38px",
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
                  flexDirection: "column",
                  gap: "1px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    lineHeight: 1,
                    fontWeight: 600,
                    letterSpacing: "-0.035em",
                  }}
                >
                  {TITLE}
                </div>
                <div
                  style={{
                    display: "flex",
                    color: TEXT_FAINT,
                    fontSize: 15,
                    lineHeight: 1,
                    fontWeight: 500,
                  }}
                >
                  Pokemon Champions damage workbench
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: TEXT_DIM,
                fontSize: 17,
                fontWeight: 500,
              }}
            >
              <div
                style={{
                  display: "flex",
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: `1px solid ${LINE}`,
                  background: SURFACE,
                }}
              >
                doubles
              </div>
              <div style={{ display: "flex" }}>{DOMAIN}</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "18px",
              width: "100%",
              flex: 1,
              marginTop: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "57%",
                gap: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 10,
                  border: `1px solid ${LINE_STRONG}`,
                  background: SURFACE,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "13px 15px",
                    borderBottom: `1px solid ${LINE}`,
                    color: TEXT_DIM,
                    fontSize: 16,
                  }}
                >
                  <div style={{ display: "flex", fontWeight: 600 }}>
                    Prompt
                  </div>
                  <div
                    style={{
                      display: "flex",
                      color: ACCENT_STRONG,
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    calc ready
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 13,
                    padding: "18px 16px 19px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      color: TEXT,
                      fontFamily: "IBM Plex Mono, ui-monospace, monospace",
                      fontSize: 26,
                      lineHeight: 1.35,
                    }}
                  >
                    incineroar !flare-blitz x gholdengo @sitrusberry
                  </div>
                  <div
                    style={{
                      display: "flex",
                      color: TEXT_DIM,
                      fontFamily: "IBM Plex Mono, ui-monospace, monospace",
                      fontSize: 19,
                    }}
                  >
                    sun atk+1 spread[1] %75
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flex: 1,
                  flexDirection: "column",
                  borderRadius: 10,
                  border: `1px solid ${LINE}`,
                  background: SURFACE,
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    maxWidth: 560,
                    fontSize: 55,
                    lineHeight: 0.98,
                    letterSpacing: "-0.055em",
                    fontWeight: 700,
                  }}
                >
                  Pokemon VGC damage calculator
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 18,
                    maxWidth: 560,
                    color: TEXT_MUTED,
                    fontSize: 23,
                    lineHeight: 1.35,
                  }}
                >
                  {SUBTITLE}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "43%",
                gap: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                }}
              >
                {[
                  ["Attacker", "Incineroar", "252 Atk"],
                  ["Defender", "Gholdengo", "188 HP"],
                ].map(([label, pokemon, spread]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      flex: 1,
                      flexDirection: "column",
                      gap: 10,
                      padding: "14px",
                      borderRadius: 10,
                      border: `1px solid ${LINE}`,
                      background: SURFACE,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        color: TEXT_FAINT,
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        color: TEXT,
                        fontSize: 24,
                        lineHeight: 1.05,
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {pokemon}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        color: TEXT_DIM,
                        fontSize: 16,
                      }}
                    >
                      {spread}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 10,
                  border: `1px solid ${LINE_STRONG}`,
                  background: SURFACE,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "13px 15px",
                    borderBottom: `1px solid ${LINE}`,
                    color: TEXT_DIM,
                    fontSize: 16,
                  }}
                >
                  <div style={{ display: "flex", fontWeight: 600 }}>
                    Result
                  </div>
                  <div
                    style={{
                      display: "flex",
                      color: SUCCESS,
                      fontWeight: 600,
                    }}
                  >
                    guaranteed 2HKO
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        color: TEXT,
                        fontSize: 34,
                        fontWeight: 700,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      64.8 - 78.1%
                    </div>
                    <div
                      style={{
                        display: "flex",
                        padding: "7px 9px",
                        borderRadius: 8,
                        background: ACCENT_SOFT,
                        color: ACCENT_STRONG,
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      16 rolls
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      height: 13,
                      overflow: "hidden",
                      borderRadius: 7,
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
                      gap: 8,
                    }}
                  >
                    {["65", "68", "71", "75", "78"].map((roll) => (
                      <div
                        key={roll}
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          flex: 1,
                          padding: "7px 0",
                          borderRadius: 8,
                          border: `1px solid ${LINE}`,
                          background: SURFACE_2,
                          color: TEXT_MUTED,
                          fontFamily: "IBM Plex Mono, ui-monospace, monospace",
                          fontSize: 15,
                        }}
                      >
                        {roll}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flex: 1,
                }}
              >
                {[
                  ["Physical", CATEGORY_PHYSICAL],
                  ["Special", CATEGORY_SPECIAL],
                  ["Modifiers", ACCENT],
                ].map(([label, color]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 10,
                      border: `1px solid ${LINE}`,
                      background: SURFACE,
                      color,
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 18,
              paddingTop: 16,
              borderTop: `1px solid ${LINE}`,
              color: TEXT_FAINT,
              fontSize: 16,
            }}
          >
            <div style={{ display: "flex" }}>
              Prompt editing, saved sets, side summaries, battle modifiers.
            </div>
            <div style={{ display: "flex", color: TEXT_DIM }}>
              {SITE_SHORT_NAME}
            </div>
          </div>
        </div>
      </div>
    </div>,
    shareImageSize,
  );
}
