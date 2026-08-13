import type { Metadata } from "next";
import { contentRepository } from "@/lib/data";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const defaultOgImage = "/og.png";

type PageSeoInput = {
  path: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
};

type CmsSeo = {
  title?: string | null;
  description?: string | null;
  canonical_url?: string | null;
  indexable?: boolean | null;
  shareUrl?: string;
  shareAlt?: string;
} | null;

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function safeDescription(value: string, fallback: string) {
  const text = value?.replace(/\s+/g, " ").trim() || fallback;
  return text.length > 170 ? `${text.slice(0, 167).trim()}...` : text;
}

export async function pageMetadata(input: PageSeoInput): Promise<Metadata> {
  const custom = await contentRepository.getSeo(input.path) as CmsSeo;
  const title = custom?.title || input.title;
  const description = safeDescription(custom?.description || input.description, input.description);
  const image = custom?.shareUrl || input.image || defaultOgImage;
  const imageAlt = custom?.shareAlt || input.imageAlt || `${title} | IAMJOSHWA`;
  const canonical = custom?.canonical_url || input.path;

  return {
    title,
    description,
    alternates: { canonical },
    robots: custom?.indexable === false ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: absoluteUrl(input.path),
      type: "website",
      siteName: "IAMJOSHWA",
      locale: "es_MX",
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
