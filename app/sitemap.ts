import type { MetadataRoute } from "next";
import { contentRepository } from "@/lib/data";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const paths: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
    ["", "weekly", 1],
    ["/fechas", "daily", 0.9],
    ["/musica", "weekly", 0.9],
    ["/lanzamientos", "weekly", 0.9],
    ["/the-vault", "weekly", 0.75],
    ["/booking", "monthly", 0.95],
    ["/epk", "monthly", 0.9],
    ["/media", "weekly", 0.7],
    ["/historia", "monthly", 0.65],
    ["/comunidad", "weekly", 0.8],
  ];
  const [events, releases, sets] = await Promise.all([
    contentRepository.getEvents(),
    contentRepository.getReleases(),
    contentRepository.getSets(),
  ]);

  return [
    ...paths.map(([path, changeFrequency, priority]) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...events.filter((event) => !event.demo).map((event) => ({
      url: `${siteUrl}/fechas/${event.slug}`,
      lastModified: new Date(event.date),
      changeFrequency: "daily" as const,
      priority: event.featured ? 0.95 : 0.82,
    })),
    ...releases.filter((release) => !release.demo).map((release) => ({
      url: `${siteUrl}/lanzamientos/${release.slug}`,
      lastModified: new Date(release.releaseAt),
      changeFrequency: "weekly" as const,
      priority: 0.82,
    })),
    ...sets.filter((set) => !set.demo).map((set) => ({
      url: `${siteUrl}/musica/${set.slug}`,
      lastModified: set.date ? new Date(set.date) : now,
      changeFrequency: "weekly" as const,
      priority: set.featured ? 0.8 : 0.72,
    })),
  ];
}
