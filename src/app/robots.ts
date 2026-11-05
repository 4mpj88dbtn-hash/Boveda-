import type { MetadataRoute } from "next";

// App personal: los buscadores no deben indexarla.
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
