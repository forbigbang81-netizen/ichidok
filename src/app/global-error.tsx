"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, background: "#0b0b0f", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          textAlign: "center",
        }}>
          <h1 style={{ fontSize: "48px", margin: "0 0 16px", color: "#f5c518" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "14px", color: "#aaa", marginBottom: "8px" }}>
            {error.message || "An unexpected error occurred"}
          </p>
          {error.digest && (
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "24px" }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              background: "#f5c518",
              color: "#000",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
