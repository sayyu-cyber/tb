import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thasbai.netlify.app";

/**
 * Emitted as a static /robots.txt at build time (works with
 * next.config.js's output:'export' - no server needed).
 *
 * The disallow list mirrors the `robots: { index: false }` set on those
 * routes' own layouts. Both matter: the meta tag stops a page that was
 * reached some other way from being indexed, while this stops crawlers
 * spending budget fetching signed-in-only screens that render an empty
 * shell to them anyway.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/home/",
        "/profile/",
        "/settings/",
        "/friends/",
        "/messages/",
        "/inventory/",
        "/collection/",
        "/achievements/",
        "/missions/",
        "/rewards/",
        "/room-cards/",
        "/player/",
        "/spectate/",
        "/play/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
