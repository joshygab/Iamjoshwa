"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  action: string;
  entityType?: string;
  entityId?: string;
  label?: string;
};

export function TrackedLink({ children, action, entityType, entityId, label, href, onClick, ...props }: Props) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (!href) return;
        const payload = JSON.stringify({ action, entityType, entityId, label, url: String(href) });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
        else void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
      }}
    >
      {children}
    </a>
  );
}
