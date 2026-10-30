"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type RevealVariant =
  | "pop"
  | "fade-up"
  | "slide-left"
  | "slide-right"
  | "scale-glow";

interface ScrollRevealProps {
  children: React.ReactNode;
  variant?: RevealVariant;
  delayMs?: number;
  durationMs?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
}

/**
 * Scroll-on-reveal wrapper that pops elements into view with spring-like physics
 * as the player scrolls down the page.
 */
export function ScrollReveal({
  children,
  variant = "pop",
  delayMs = 0,
  durationMs = 620,
  threshold = 0.12,
  once = true,
  className,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -36px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  const hiddenStyles: Record<RevealVariant, string> = {
    pop: "opacity-0 translate-y-7 scale-[0.91] blur-[2px]",
    "fade-up": "opacity-0 translate-y-8 blur-[1px]",
    "slide-left": "opacity-0 -translate-x-8 scale-[0.96]",
    "slide-right": "opacity-0 translate-x-8 scale-[0.96]",
    "scale-glow": "opacity-0 scale-[0.86] translate-y-5 blur-[3px]",
  };

  const easing =
    variant === "pop" || variant === "scale-glow"
      ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
      : "cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div
      ref={ref}
      style={{
        transitionProperty: "opacity, transform, filter",
        transitionDuration: `${durationMs}ms`,
        transitionDelay: `${delayMs}ms`,
        transitionTimingFunction: easing,
        willChange: "opacity, transform",
      }}
      className={cn(
        visible
          ? "opacity-100 translate-x-0 translate-y-0 scale-100 blur-0"
          : hiddenStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Smoothly interpolates numeric values (resources, scores, counters) when they change.
 */
export function AnimatedNumber({
  value,
  durationMs = 520,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    const startVal = prevRef.current;
    const endVal = value;
    if (startVal === endVal) return;

    setPulsing(true);
    const pulseTimer = setTimeout(() => setPulsing(false), durationMs);

    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setDisplay(current);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = endVal;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(pulseTimer);
    };
  }, [value, durationMs]);

  return (
    <span
      className={cn(
        "inline-block transition-transform duration-300",
        pulsing && "scale-110 text-amber-200",
        className
      )}
    >
      {display}
    </span>
  );
}

