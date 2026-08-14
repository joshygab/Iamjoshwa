"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

export function PublicLinkActions({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);
  const absolute = typeof window === "undefined" ? href : new URL(href, window.location.origin).toString();

  async function copyLink() {
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="public-link-actions">
      <a className="button secondary" href={href} target="_blank" rel="noreferrer">
        <ExternalLink /> Ver página pública
      </a>
      <button className="button secondary" type="button" onClick={copyLink}>
        <Copy /> {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}
