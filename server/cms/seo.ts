import type { Express, Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import type { PublicListing } from "../db";
import * as listingDb from "../db";
import * as cmsDb from "./db";

export type HtmlTransform = (url: string, html: string) => Promise<string>;

type SeoPage = {
  siteName?: string;
  title: string;
  description: string;
  path: string;
  body: string;
  noIndex?: boolean;
  image?: string | null;
  type?: "website" | "article";
};

let templatePromise: Promise<string> | undefined;

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function publicBaseUrl(): string | null {
  const candidate = process.env.PUBLIC_SITE_URL?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function canonicalFor(routePath: string): string | null {
  const base = publicBaseUrl();
  if (!base) return null;
  const pathname = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${base}${pathname}`;
}

function absoluteMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch {
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
      const base = publicBaseUrl();
      return base ? `${base}${value}` : null;
    }
  }
  return null;
}

function templatePath() {
  return process.env.NODE_ENV === "production"
    ? path.join(process.cwd(), "dist", "public", "index.html")
    : path.join(process.cwd(), "client", "index.html");
}

async function loadTemplate() {
  templatePromise ??= fs.readFile(templatePath(), "utf8");
  return templatePromise;
}

function plainText(text: string) {
  return text.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, "<br>")}</p>`).join("");
}

function safeHref(href: string) {
  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) return href;
  try {
    const url = new URL(href);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "/";
  } catch {
    return "/";
  }
}

function navLinks(items: Array<{ label: string; href: string }>) {
  return items.map((item) => `<a href="${escapeHtml(safeHref(item.href))}">${escapeHtml(item.label)}</a>`).join("");
}

function imageMarkup(listing: PublicListing, index = 0) {
  const source = listing.images[index];
  return source ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(listing.name)} profil fotoğrafı" loading="lazy" />` : "";
}

function listingCards(items: PublicListing[]) {
  if (!items.length) return `<p class="seo-empty">Bu sayfada şu anda yayında ilan bulunmuyor.</p>`;
  return `<div class="seo-cards">${items.map((item) => `<article class="seo-card">
    <a class="seo-card-image" href="/profil/${encodeURIComponent(item.slug)}">${imageMarkup(item)}</a>
    <div><p class="seo-eyebrow">${escapeHtml(item.location)}</p>
      <h2><a href="/profil/${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}, ${item.age}</a></h2>
      <p>${escapeHtml(item.summary)}</p>
      ${item.categorySlug && item.categoryName ? `<p class="seo-small"><a href="/kategori/${encodeURIComponent(item.categorySlug)}">${escapeHtml(item.categoryName)}</a></p>` : ""}
      <p class="seo-small">${item.verified ? "Yönetici tarafından onaylı" : "Yayında"} · ${escapeHtml(item.district)}</p>
    </div>
  </article>`).join("")}</div>`;
}

function pageShell(layout: Awaited<ReturnType<typeof cmsDb.getPublicLayout>>, body: string) {
  const { settings, header, footer, categories, locations } = layout;
  const categoryLinks = categories.map((item) => `<a href="/kategori/${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a>`).join("");
  const regionLinks = locations.map((item) => `<a href="/bolge/${encodeURIComponent(item.citySlug)}/${encodeURIComponent(item.districtSlug)}">${escapeHtml(item.city)} · ${escapeHtml(item.district)}</a>`).join("");
  return `<div class="seo-prerender">
    <header class="seo-header"><a class="seo-brand" href="/">${escapeHtml(settings.siteName)}</a><nav aria-label="Ana menü">${navLinks(header)}</nav></header>
    <main>${body}</main>
    <section class="seo-directory"><h2>Kategoriler</h2><div>${categoryLinks || "<span>Henüz kategori eklenmedi.</span>"}</div><h2>Bölgeler</h2><div>${regionLinks}</div></section>
    <footer class="seo-footer"><a href="/">${escapeHtml(settings.siteName)}</a><nav aria-label="Alt menü">${navLinks(footer)}</nav><small>Yalnızca 18 yaş ve üzeri ziyaretçiler içindir.</small></footer>
  </div>`;
}

const serverStyle = `<style id="seo-prerender-style">
.seo-prerender{max-width:1160px;margin:0 auto;padding:20px 24px 48px;color:#302632;font-family:Arial,sans-serif;line-height:1.65}
.seo-prerender a{color:#754353;text-decoration:none}.seo-prerender a:hover{text-decoration:underline}.seo-header,.seo-footer{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:18px 0;border-bottom:1px solid #e9e1e7}.seo-header nav,.seo-footer nav,.seo-directory>div{display:flex;flex-wrap:wrap;gap:14px}.seo-brand{font-size:22px;font-weight:700}.seo-prerender main{padding:26px 0}.seo-prerender h1{margin:0 0 12px;font-size:clamp(28px,4vw,48px);line-height:1.1}.seo-prerender h2{font-size:22px;line-height:1.2}.seo-hero{padding:34px;border-radius:16px;background:linear-gradient(130deg,#f7eaf0,#fff 68%,#eee8f4)}.seo-eyebrow,.seo-small{color:#776b78;font-size:13px}.seo-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px;margin:20px 0}.seo-card{display:grid;grid-template-columns:120px 1fr;gap:14px;align-items:start;padding:14px;border:1px solid #ece4eb;border-radius:12px;background:#fff}.seo-card h2{margin:5px 0;font-size:19px}.seo-card p{margin:5px 0}.seo-card-image img{width:120px;height:150px;border-radius:8px;object-fit:cover}.seo-directory{padding:14px 0;border-top:1px solid #e9e1e7}.seo-directory h2{margin:10px 0;font-size:16px}.seo-footer{align-items:flex-start;border-top:1px solid #e9e1e7;border-bottom:0}.seo-footer small{color:#776b78}.seo-content p{max-width:850px}.seo-profile-gallery{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}.seo-profile-gallery img{width:min(220px,40vw);height:280px;object-fit:cover;border-radius:12px}.seo-empty{padding:18px;border:1px solid #ece4eb;border-radius:10px}.seo-prerender [aria-hidden=true]{display:none}@media(max-width:650px){.seo-prerender{padding:12px 16px 30px}.seo-header,.seo-footer{align-items:flex-start;flex-direction:column}.seo-card{grid-template-columns:90px 1fr}.seo-card-image img{width:90px;height:120px}.seo-hero{padding:22px}}
</style>`;

async function renderPageHtml(page: SeoPage) {
  let html = await loadTemplate();
  const title = page.title.slice(0, 180);
  const description = page.description.slice(0, 320);
  const canonical = canonicalFor(page.path);
  const image = absoluteMediaUrl(page.image);
  const metadata = [
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : "",
    `<meta property="og:site_name" content="${escapeHtml(page.siteName || "VIP İlan")}" />`,
    `<meta property="og:type" content="${page.type ?? "website"}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}" />` : "",
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : "",
    page.noIndex ? `<meta name="robots" content="noindex, nofollow" />` : "",
  ].filter(Boolean).join("\n    ");
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
  html = html.replace("</head>", `${serverStyle}\n    ${metadata}\n  </head>`);
  html = html.replace(/<div id=["']root["']\s*><\/div>/i, `<div id="root">${page.body}</div>`);
  return html;
}

async function sendPage(res: Response, page: SeoPage, status = 200, transform?: HtmlTransform, requestUrl = page.path) {
  let html = await renderPageHtml(page);
  if (transform) html = await transform(requestUrl, html);
  if (page.noIndex) res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.status(status).setHeader("Cache-Control", page.path === "/admin" ? "private, no-store" : "no-cache").type("html").send(html);
}

function routeFailure(res: Response) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  return res.status(503).type("text/plain").send("Sayfa içeriği şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.");
}

export function registerSeoRoutes(app: Express, transform?: HtmlTransform) {
  app.get("/", async (req, res) => {
    try {
      const [layout, items] = await Promise.all([cmsDb.getPublicLayout(), listingDb.getPublicListings()]);
      const settings = layout.settings;
      const body = pageShell(layout, `<section class="seo-hero"><p class="seo-eyebrow">${escapeHtml(settings.heroEyebrow)}</p><h1>${escapeHtml(settings.heroHeading)}</h1><p>${escapeHtml(settings.heroBody)}</p><p>${escapeHtml(settings.homeDescription)}</p></section><section id="profiles"><h2>Yayındaki profiller</h2>${listingCards(items)}</section>`);
      await sendPage(res, { siteName: settings.siteName, title: settings.homeTitle || settings.defaultSeoTitle, description: settings.homeDescription || settings.defaultSeoDescription, path: "/", body, image: settings.defaultSocialImage }, 200, transform, req.originalUrl);
    } catch {
      routeFailure(res);
    }
  });

  app.get("/profil/:slug", async (req, res) => {
    try {
      const [layout, profile] = await Promise.all([cmsDb.getPublicLayout(), listingDb.getPublicListing(req.params.slug)]);
      if (!profile) {
        await sendPage(res, { siteName: layout.settings.siteName, title: `İlan bulunamadı | ${layout.settings.siteName}`, description: "Bu ilan yayında değil veya bulunamadı.", path: req.path, body: pageShell(layout, "<section><h1>İlan bulunamadı</h1><p>İlan yayından kaldırılmış veya adresi değişmiş olabilir.</p><p><a href='/'>Yayındaki ilanlara dön</a></p></section>"), noIndex: true }, 404, transform, req.originalUrl);
        return;
      }
      const profileBody = `<article class="seo-content"><p class="seo-eyebrow">${escapeHtml(profile.location)} · ${escapeHtml(profile.district)}</p><h1>${escapeHtml(profile.name)}, ${profile.age}</h1><p>${escapeHtml(profile.summary)}</p><div class="seo-profile-gallery">${profile.images.map((source, index) => `<img src="${escapeHtml(source)}" alt="${escapeHtml(profile.name)} profil fotoğrafı ${index + 1}" loading="lazy" />`).join("")}</div><section><h2>Profil hakkında</h2>${plainText(profile.about)}</section>${profile.tags.length ? `<p class="seo-small">Özellikler: ${profile.tags.map(escapeHtml).join(" · ")}</p>` : ""}${profile.categorySlug && profile.categoryName ? `<p><a href="/kategori/${encodeURIComponent(profile.categorySlug)}">${escapeHtml(profile.categoryName)} kategorisindeki ilanlar</a></p>` : ""}<p><a href="/bolge/${encodeURIComponent(profile.citySlug ?? "antalya")}/${encodeURIComponent(profile.districtSlug ?? "merkez")}">${escapeHtml(profile.location)} bölgesindeki profiller</a></p></article>`;
      const body = pageShell(layout, profileBody);
      const title = profile.seoTitle || `${profile.name}, ${profile.age} | ${profile.district} | ${layout.settings.siteName}`;
      const description = profile.seoDescription || profile.summary;
      await sendPage(res, { siteName: layout.settings.siteName, title, description, path: `/profil/${encodeURIComponent(profile.slug)}`, body, image: profile.images[0], type: "article", noIndex: !profile.allowIndexing }, 200, transform, req.originalUrl);
    } catch {
      routeFailure(res);
    }
  });

  app.get("/kategori/:slug", async (req, res) => {
    try {
      const [layout, page] = await Promise.all([cmsDb.getPublicLayout(), cmsDb.getPublicCategoryPage(req.params.slug)]);
      if (!page) {
        await sendPage(res, { siteName: layout.settings.siteName, title: `Kategori bulunamadı | ${layout.settings.siteName}`, description: "Bu kategori yayında değil veya bulunamadı.", path: req.path, body: pageShell(layout, "<section><h1>Kategori bulunamadı</h1><p>Bu kategori mevcut değil.</p></section>"), noIndex: true }, 404, transform, req.originalUrl);
        return;
      }
      const category = page.category;
      const body = pageShell(layout, `<section class="seo-hero"><p class="seo-eyebrow">KATEGORİ</p><h1>${escapeHtml(category.name)} ilanları</h1>${plainText(category.description)}</section><section><h2>${escapeHtml(category.name)} kategorisinde yayındaki profiller</h2>${listingCards(page.listings)}</section>`);
      await sendPage(res, { siteName: layout.settings.siteName, title: category.seoTitle || `${category.name} ilanları | ${layout.settings.siteName}`, description: category.seoDescription || category.description || layout.settings.defaultSeoDescription, path: `/kategori/${encodeURIComponent(category.slug)}`, body, image: layout.settings.defaultSocialImage, noIndex: !category.allowIndexing || page.listings.length === 0 }, 200, transform, req.originalUrl);
    } catch {
      routeFailure(res);
    }
  });

  const renderLocation = async (req: Request, res: Response, citySlug: string, districtSlug?: string) => {
    try {
      const [layout, page] = await Promise.all([cmsDb.getPublicLayout(), cmsDb.getPublicLocationPage(citySlug, districtSlug)]);
      if (!page) {
        await sendPage(res, { siteName: layout.settings.siteName, title: `Bölge bulunamadı | ${layout.settings.siteName}`, description: "Bu şehir veya semt yayında değil.", path: req.path, body: pageShell(layout, "<section><h1>Bölge bulunamadı</h1><p>Bu şehir veya semt adresi mevcut değil.</p></section>"), noIndex: true }, 404, transform, req.originalUrl);
        return;
      }
      const label = page.district ? `${page.district}, ${page.city}` : page.city;
      const description = page.seoDescription || page.description || `${label} bölgesindeki yayındaki profilleri keşfedin.`;
      const regionLinks = page.locations.map((location) => `<a href="/bolge/${encodeURIComponent(location.citySlug)}/${encodeURIComponent(location.districtSlug)}">${escapeHtml(location.district)}, ${escapeHtml(location.city)}</a>`).join(" · ");
      const body = pageShell(layout, `<section class="seo-hero"><p class="seo-eyebrow">BÖLGE REHBERİ</p><h1>${escapeHtml(label)} ilanları</h1>${plainText(description)}${!page.district ? `<p>${regionLinks}</p>` : ""}</section><section><h2>${escapeHtml(label)} bölgesinde yayındaki profiller</h2>${listingCards(page.listings)}</section>`);
      const routePath = page.district ? `/bolge/${encodeURIComponent(page.citySlug)}/${encodeURIComponent(page.districtSlug ?? "")}` : `/bolge/${encodeURIComponent(page.citySlug)}`;
      const title = page.seoTitle || `${label} ilanları | ${layout.settings.siteName}`;
      await sendPage(res, { siteName: layout.settings.siteName, title, description, path: routePath, body, image: layout.settings.defaultSocialImage, noIndex: !page.allowIndexing }, 200, transform, req.originalUrl);
    } catch {
      routeFailure(res);
    }
  };
  app.get("/bolge/:citySlug/:districtSlug", (req, res) => renderLocation(req, res, req.params.citySlug, req.params.districtSlug));
  app.get("/bolge/:citySlug", (req, res) => renderLocation(req, res, req.params.citySlug));

  app.get("/icerik/:slug", async (req, res) => {
    try {
      const [layout, page] = await Promise.all([cmsDb.getPublicLayout(), cmsDb.getPublicContentPage(req.params.slug)]);
      if (!page) {
        await sendPage(res, { siteName: layout.settings.siteName, title: `Sayfa bulunamadı | ${layout.settings.siteName}`, description: "Bu içerik yayınlanmamış veya bulunamadı.", path: req.path, body: pageShell(layout, "<section><h1>Sayfa bulunamadı</h1><p>Bu içerik mevcut değil veya henüz yayımlanmadı.</p></section>"), noIndex: true }, 404, transform, req.originalUrl);
        return;
      }
      const body = pageShell(layout, `<article class="seo-content"><p class="seo-eyebrow">${escapeHtml(layout.settings.siteName)}</p><h1>${escapeHtml(page.title)}</h1>${page.summary ? `<p>${escapeHtml(page.summary)}</p>` : ""}${plainText(page.body)}</article>`);
      await sendPage(res, { siteName: layout.settings.siteName, title: page.seoTitle || `${page.title} | ${layout.settings.siteName}`, description: page.seoDescription || page.summary || layout.settings.defaultSeoDescription, path: `/icerik/${encodeURIComponent(page.slug)}`, body, image: layout.settings.defaultSocialImage, type: "article", noIndex: !page.allowIndexing || (!page.summary.trim() && !page.body.trim()) }, 200, transform, req.originalUrl);
    } catch {
      routeFailure(res);
    }
  });

  app.get("/admin", async (req, res) => {
    try {
      const layout = await cmsDb.getPublicLayout();
      await sendPage(res, { title: `Yönetim | ${layout.settings.siteName}`, description: "Yönetici alanı.", path: "/admin", body: "", noIndex: true }, 200, transform, req.originalUrl);
    } catch {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.setHeader("Cache-Control", "private, no-store");
      res.status(200).sendFile(templatePath());
    }
  });

  app.get("/robots.txt", (_req, res) => {
    const base = publicBaseUrl();
    const content = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api/", ...(base ? [`Sitemap: ${base}/sitemap.xml`] : [])].join("\n") + "\n";
    res.type("text/plain; charset=utf-8").setHeader("Cache-Control", "no-cache").send(content);
  });

  app.get("/sitemap.xml", async (_req, res) => {
    const base = publicBaseUrl();
    if (!base) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.status(503).type("text/plain").send("Sitemap için Coolify ortamında PUBLIC_SITE_URL=https://cesmebutik.vip ayarlanmalıdır.");
      return;
    }
    try {
      const data = await cmsDb.getPublicSitemapData();
      const entries = new Map<string, string>();
      entries.set(`${base}/`, new Date().toISOString().slice(0, 10));
      for (const item of data.listings) entries.set(`${base}/profil/${encodeURIComponent(item.slug)}`, item.updatedAt.toISOString().slice(0, 10));
      for (const item of data.categories) entries.set(`${base}/kategori/${encodeURIComponent(item.slug)}`, item.updatedAt.toISOString().slice(0, 10));
      for (const item of data.locations) {
        entries.set(`${base}/bolge/${encodeURIComponent(item.citySlug)}`, item.updatedAt.toISOString().slice(0, 10));
        entries.set(`${base}/bolge/${encodeURIComponent(item.citySlug)}/${encodeURIComponent(item.districtSlug)}`, item.updatedAt.toISOString().slice(0, 10));
      }
      for (const item of data.pages) entries.set(`${base}/icerik/${encodeURIComponent(item.slug)}`, item.updatedAt.toISOString().slice(0, 10));
      const urls = [...entries.entries()].map(([loc, lastmod]) => `<url><loc>${escapeHtml(loc)}</loc><lastmod>${lastmod}</lastmod></url>`).join("");
      const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
      res.type("application/xml; charset=utf-8").setHeader("Cache-Control", "no-cache").send(xml);
    } catch {
      routeFailure(res);
    }
  });
}
