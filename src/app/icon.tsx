import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8f5ef",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 360,
            height: 360,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              backgroundColor: "#f0e6d8",
              border: "4px solid #d8c8b3",
              borderRadius: 36,
              transform: "translate(-70px, -60px)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              backgroundColor: "#f7efe5",
              border: "4px solid #e1d4c2",
              borderRadius: 36,
              transform: "translate(0px, 0px)",
              boxShadow: "0 28px 70px rgba(0,0,0,0.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              backgroundColor: "#fbf8f2",
              border: "4px solid #eadfce",
              borderRadius: 36,
              transform: "translate(70px, 60px)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
            }}
          />
        </div>
      </div>
    ),
    size
  );
}
