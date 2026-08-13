import type { MetadataRoute } from "next";
import { contentRepository } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const paths = ["", "/fechas", "/musica", "/lanzamientos", "/the-vault", "/booking", "/epk", "/media", "/historia", "/comunidad"];
  const [events, releases, sets] = await Promise.all([contentRepository.getEvents(), contentRepository.getReleases(), contentRepository.getSets()]);

  return [
    ...paths.map((url) => ({ url: `${base}${url}`, changeFrequency: "weekly" as const })),
    ...events.map((event) => ({ url: `${base}/fechas/${event.slug}`, changeFrequency: "daily" as const })),
    ...releases.map((release) => ({ url: `${base}/lanzamientos/${release.slug}`, changeFrequency: "weekly" as const })),
    ...sets.map((set) => ({ url: `${base}/musica/${set.slug}`, changeFrequency: "weekly" as const })),
  ];
}
