"use client";

import { useEffect } from "react";

export function ImmersiveEffects() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    function move(event: PointerEvent) {
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
      root.style.setProperty("--parallax-x", `${(event.clientX / window.innerWidth - 0.5) * 18}px`);
      root.style.setProperty("--parallax-y", `${(event.clientY / window.innerHeight - 0.5) * 18}px`);
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting)),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
    window.addEventListener("pointermove", move, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return <div className="cursor-glow" aria-hidden="true" />;
}
