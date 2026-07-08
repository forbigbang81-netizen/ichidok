"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      textAlign: "center",
      background: "#0b0b0f",
      color: "#fff",
    }}>
      <h2 style={{ fontSize: "20px", marginBottom: "8px", color: "#f5c518" }}>
        Failed to load
      </h2>
      <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "16px" }}>
        {error.message || "Something went wrong"}
      </p>
      <button
        onClick={() => reset()}
        style={{
          background: "#f5c518",
          color: "#000",
          border: "none",
          padding: "8px 16px",
          borderRadius: "6px",
          fontWeight: "bold",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        Try again
      </button>
    </div>
  );
}
