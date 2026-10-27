import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl) return [];

  let base: URL;
  try {
    base = new URL(configuredUrl);
    if (base.protocol !== "https:" && base.hostname !== "localhost") return [];
  } catch {
    return [];
  }

  const paths = ["/", "/jobs", "/companies", "/talent", "/pricing", "/about", "/contact", "/privacy", "/terms"];
  const now = new Date();
  return paths.map((path) => ({
    url: new URL(path, base).toString(),
    lastModified: now,
    changeFrequency: path === "/" || path === "/jobs" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === "/jobs" ? 0.9 : 0.5,
  }));
}
