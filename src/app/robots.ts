import type { MetadataRoute } from "next";

// App personal: los buscadores no deben indexarla.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
