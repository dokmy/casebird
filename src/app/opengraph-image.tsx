import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Casebird - Hong Kong Legal Research Assistant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#ffffff",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
        }}
      >
        {/* Feather icon - large and prominent */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width="280"
          height="280"
          style={{ marginBottom: 32 }}
        >
          <path
            d="M20.5 2.5C16 3 12.5 6 10 10C8 13 6.5 16.5 5.5 19.5L4 21L5.5 19.5C8 18 11 17 14 17C16.5 17 18.5 15.5 19.5 13.5C20.5 11.5 21 9 21 6.5C21 4.5 21 3 20.5 2.5Z"
            fill="#015d63"
            fillOpacity="0.2"
          />
          <path
            d="M20.5 2.5C16 3 12.5 6 10 10C8 13 6.5 16.5 5.5 19.5L4 21"
            stroke="#015d63"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 10C12 9 14.5 9 17 10"
            stroke="#015d63"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M8.5 13C10.5 12.5 13 12.5 15.5 14"
            stroke="#015d63"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M7 16C9 15.5 11 15.5 13.5 17"
            stroke="#015d63"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>

        <div
          style={{
            fontSize: 56,
            fontWeight: 600,
            color: "#015d63",
            letterSpacing: "-0.02em",
          }}
        >
          Casebird
        </div>
      </div>
    ),
    { ...size }
  );
}
