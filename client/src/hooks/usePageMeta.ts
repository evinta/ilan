import { useEffect } from "react";

type PageMetaOptions = {
  title: string;
  description: string;
  path: string;
  siteName?: string;
  image?: string | null;
  noIndex?: boolean;
  type?: "website" | "article";
};

function upsertMeta(selector: string, attribute: "name" | "property", key: string, content: string | null) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!content) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function usePageMeta({ title, description, path, siteName = "VIP İlan", image, noIndex = false, type = "website" }: PageMetaOptions) {
  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex, nofollow" : null);
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", siteName);
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", image ? "summary_large_image" : "summary");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    const base = window.__MANUS_CONFIG__?.siteUrl;
    let canonical: string | null = null;
    if (base) {
      try { canonical = new URL(path, base).href; } catch { canonical = null; }
    }
    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) canonicalLink?.remove();
    else {
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.rel = "canonical";
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = canonical;
    }
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    let absoluteImage: string | null = null;
    if (image && !image.startsWith("//") && !image.includes("\\")) {
      try {
        const parsed = new URL(image, base || window.location.origin);
        if (["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password) absoluteImage = parsed.href;
      } catch { absoluteImage = null; }
    }
    upsertMeta('meta[property="og:image"]', "property", "og:image", absoluteImage);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", absoluteImage);
  }, [title, description, path, siteName, image, noIndex, type]);
}
