"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ImmersiveEffects() {
  const pathname = usePathname();
  const routeLabel = routeSignal(pathname);

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
    root.classList.toggle("has-fine-pointer", window.matchMedia("(pointer: fine)").matches);
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
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      root.style.setProperty("--scroll-y", `${Math.min(1, window.scrollY / Math.max(1, window.innerHeight))}`);
      root.style.setProperty("--scroll-progress", `${progress}`);
    }

    function tap(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest("a,button,[role='button'],input,select,textarea,summary");
      if (!interactive) return;
      const ripple = document.createElement("span");
      ripple.className = "tap-ripple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.body.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 620);
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
    window.addEventListener("pointerdown", tap, { passive: true });
    window.addEventListener("scroll", updateScrollMotion, { passive: true });
    window.addEventListener("resize", updateScrollMotion, { passive: true });

    return () => {
      root.classList.remove("motion-ready");
      root.classList.remove("route-entering");
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", tap);
      window.removeEventListener("scroll", updateScrollMotion);
      window.removeEventListener("resize", updateScrollMotion);
    };
  }, []);

  return (
    <>
      <div className="premium-scroll-progress" aria-hidden="true"><span /></div>
      <div className="premium-page-transition" aria-hidden="true" />
      <div className="route-signal-label" aria-hidden="true">{routeLabel}</div>
      <div className="premium-ambient-field" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="cursor-glow" aria-hidden="true" />
    </>
  );
}

function routeSignal(pathname: string) {
  if (pathname === "/") return "IAMJOSHWA WORLD";
  if (pathname.startsWith("/fechas")) return "SHOW SIGNAL";
  if (pathname.startsWith("/musica")) return "NOW PLAYING";
  if (pathname.startsWith("/lanzamientos")) return "RELEASE MODE";
  if (pathname.startsWith("/the-vault")) return "VAULT ACCESS";
  if (pathname.startsWith("/comunidad") || pathname.startsWith("/perfil") || pathname.startsWith("/pass")) return "INNER CIRCLE";
  if (pathname.startsWith("/booking")) return "BOOKING SIGNAL";
  if (pathname.startsWith("/epk")) return "MEDIA KIT";
  if (pathname.startsWith("/checkin")) return "PASS CHECK-IN";
  return "OFFICIAL SIGNAL";
}
