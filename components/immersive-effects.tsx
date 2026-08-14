"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ImmersiveEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    root.classList.remove("route-entering");
    void root.offsetWidth;
    root.classList.add("route-entering");
    const timeout = window.setTimeout(() => root.classList.remove("route-entering"), 620);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.toggle("motion-ready", !reduced);
    if (reduced) return;

    const observed = new WeakSet<Element>();
    const revealSelector = [
      ".reveal",
      "main > section",
      ".section",
      ".page-hero",
      ".event-card",
      ".set-card",
      ".release-card",
      ".list-card",
      ".signal-feed-card",
      ".media-gallery article",
      ".community-mission-grid a",
      ".community-feed-grid a",
      ".vault-drop-grid article",
      ".reward-card",
      ".pass-live-command article",
      ".public-pass-card",
      ".public-pass-panel",
    ].join(",");

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

    function watchRevealNode(node: Element, index: number) {
        if (observed.has(node)) return;
        observed.add(node);
        if (node instanceof HTMLElement) {
          if (!node.classList.contains("reveal")) node.classList.add("premium-reveal");
          node.style.setProperty("--reveal-index", String(index % 10));
        }
        observer.observe(node);
    }

    function observeRevealNodes(scope: ParentNode = document) {
      scope.querySelectorAll(revealSelector).forEach((node, index) => {
        watchRevealNode(node, index);
      });
    }

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(revealSelector)) watchRevealNode(node, 0);
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
      root.classList.remove("route-entering");
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", updateScrollMotion);
    };
  }, []);

  return (
    <>
      <div className="premium-page-transition" aria-hidden="true" />
      <div className="premium-ambient-field" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="cursor-glow" aria-hidden="true" />
    </>
  );
}
