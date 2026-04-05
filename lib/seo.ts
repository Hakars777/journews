import { getBaseUrl } from "@/lib/site";

export function buildCanonicalUrl(path = "/") {
  const base = getBaseUrl().replace(/\/+$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildCanonicalUrl(item.path),
    })),
  };
}

export function buildOrganizationJsonLd(name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: buildCanonicalUrl("/"),
    logo: buildCanonicalUrl("/api/favicon"),
    inLanguage: "hy",
  };
}

export function buildWebsiteJsonLd(name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    description,
    url: buildCanonicalUrl("/"),
    inLanguage: "hy",
    potentialAction: {
      "@type": "SearchAction",
      target: `${buildCanonicalUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
