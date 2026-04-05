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

export function buildCategoryPageDescription(name: string, description?: string | null) {
  const value = description?.trim();
  return value || `${name} բաժնի վերջին հրապարակումները Jour News-ում։`;
}

export function buildTagPageDescription(name: string) {
  return `${name} պիտակով հրապարակված նյութերը Jour News-ում։`;
}

export function buildAuthorPageDescription(name: string, bio?: string | null) {
  const value = bio?.trim();
  return value || `${name}-ի հրապարակումները Jour News-ում։`;
}

export function buildCollectionPageJsonLd({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: buildCanonicalUrl(path),
    inLanguage: "hy",
    isPartOf: buildCanonicalUrl("/"),
  };
}

export function buildPersonJsonLd({
  name,
  path,
  description,
  image,
}: {
  name: string;
  path: string;
  description?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: buildCanonicalUrl(path),
    description,
    image,
  };
}
