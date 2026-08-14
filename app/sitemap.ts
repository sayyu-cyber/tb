import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thasbai.netlify.app";

/**
 * Emitted as a static /sitemap.xml at build time.
 *
 * Deliberately lists only the publicly meaningful routes - the same set
 * left indexable in app/robots.ts. Signed-in-only screens (home, profile,
 * inventory, the game routes, etc.) are excluded: a crawler sees an empty
 * shell there, so listing them would only waste crawl budget.
 *
 * trailingSlash is true in next.config.js, so the URLs here carry one to
 * match what actually gets served and avoid a redirect hop.
 */
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "monthly" },
  { path: "/login/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/play/", priority: 0.9, changeFrequency: "monthly" },
  { path: "/leaderboard/", priority: 0.7, changeFrequency: "daily" },
  { path: "/hall-of-fame/", priority: 0.6, changeFrequency: "weekly" },
  { path: "/tournament/", priority: 0.6, changeFrequency: "weekly" },
  { path: "/clubs/", priority: 0.5, changeFrequency: "weekly" },
  { path: "/shop/", priority: 0.5, changeFrequency: "weekly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
