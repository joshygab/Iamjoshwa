"use client";

import { useEffect } from "react";

export function ImmersiveEffects() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.toggle("motion-ready", !reduced);
    if (reduced) return;

    const observed = new WeakSet<Element>();

    function move(event: PointerEvent) {
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
      root.style.setProperty("--parallax-x", `${(event.clientX / window.innerWidth - 0.5) * 18}px`);
      root.style.setProperty("--parallax-y", `${(event.clientY / window.innerHeight - 0.5) * 18}px`);
    }

    function updateScrollMotion() {
      root.style.setProperty("--scroll-y", `${Math.min(1, window.scrollY / Math.max(1, window.innerHeight))}`);
    }

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
        }),
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );

    function observeRevealNodes(scope: ParentNode = document) {
      scope.querySelectorAll(".reveal").forEach((node, index) => {
        if (observed.has(node)) return;
        observed.add(node);
        if (node instanceof HTMLElement) node.style.setProperty("--reveal-index", String(index % 8));
        observer.observe(node);
      });
    }

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(".reveal")) {
            if (node instanceof HTMLElement) node.style.setProperty("--reveal-index", "0");
            if (!observed.has(node)) {
              observed.add(node);
              observer.observe(node);
            }
          }
          observeRevealNodes(node);
        });
      });
    });

    observeRevealNodes();
    updateScrollMotion();
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", updateScrollMotion, { passive: true });

    return () => {
      root.classList.remove("motion-ready");
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", updateScrollMotion);
    };
  }, []);

  return <div className="cursor-glow" aria-hidden="true" />;
}
