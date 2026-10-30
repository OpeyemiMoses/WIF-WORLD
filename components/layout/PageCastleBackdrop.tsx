"use client";

import React from "react";

/**
 * Shared atmospheric castle kingdom backdrop & warm golden-crimson lighting
 * used across non-gameplay pages (/events, /missions, /activity, /admin).
 */
export function PageCastleBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-top bg-no-repeat opacity-25"
        style={{ backgroundImage: "url('/art/hero-kingdom.jpg')" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(7,11,14,0.65) 0%, rgba(7,11,14,0.88) 42%, #070B0E 100%)",
        }}
      />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[420px] w-[780px] rounded-full bg-crimson/12 blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 h-[360px] w-[520px] rounded-full bg-amber-500/8 blur-[160px]" />
    </div>
  );
}

