import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { type AddressInfo } from "node:net";

const cmsMocks = vi.hoisted(() => ({
  getPublicLayout: vi.fn(),
  getPublicCategoryPage: vi.fn(),
  getPublicLocationPage: vi.fn(),
  getPublicContentPage: vi.fn(),
  getPublicSitemapData: vi.fn(),
}));
const listingMocks = vi.hoisted(() => ({
  getPublicListings: vi.fn(),
  getPublicListing: vi.fn(),
}));

vi.mock("./db", () => cmsMocks);
vi.mock("../db", () => listingMocks);

import { registerSeoRoutes } from "./seo";

const layout = {
  settings: {
    siteName: "VIP İlan",
    homeTitle: "Antalya profilleri | VIP İlan",
    homeDescription: "Güven odaklı seçkileri keşfedin.",
    heroEyebrow: "ANTALYA",
    heroHeading: "Özenle keşfet",
    heroBody: "Yayınlanan ilanları inceleyin.",
    defaultSeoTitle: "VIP İlan",
    defaultSeoDescription: "VIP İlan hakkında.",
    defaultSocialImage: null,
  },
  header: [{ id: 1, label: "Tümü", href: "/#profiles" }],
  footer: [{ id: 2, label: "Yayın ilkeleri", href: "/icerik/yayin-ilkeleri" }],
  categories: [],
  locations: [],
};
const listing = {
  id: 7,
  slug: "vika-224",
  name: "Vika",
  age: 27,
  district: "Lara",
  location: "Antalya, Lara",
  summary: "Yetişkin ziyaretçilere yönelik örnek profil tanıtımı.",
  about: "Özgün açıklama metni.",
  height: "168 cm",
  languages: ["Türkçe"],
  tags: ["Özenli"],
  images: ["/uploads/vip-ilan/listings/cover.webp"],
  verified: true,
  premium: false,
  categoryId: null,
  categoryName: null,
  categorySlug: null,
  locationId: 1,
  city: "Antalya",
  citySlug: "antalya",
  districtSlug: "lara",
  seoTitle: "Vika | Lara profili",
  seoDescription: "Vika profilinin özgün arama açıklaması.",
  allowIndexing: false,
};

type TestServer = ReturnType<ReturnType<typeof express>["listen"]>;
let server: TestServer;
let origin: string;

beforeAll(async () => {
  const app = express();
  registerSeoRoutes(app);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

beforeEach(() => {
  vi.stubEnv("PUBLIC_SITE_URL", "https://cesmebutik.vip");
  cmsMocks.getPublicLayout.mockResolvedValue(layout);
  cmsMocks.getPublicSitemapData.mockResolvedValue({
    listings: [{ slug: "vika-224", updatedAt: new Date("2026-10-01T00:00:00.000Z") }],
    categories: [],
    locations: [],
    pages: [],
  });
  listingMocks.getPublicListings.mockResolvedValue([listing]);
  listingMocks.getPublicListing.mockResolvedValue(listing);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("server-rendered SEO routes", () => {
  it("serves actual homepage content and canonical/OG metadata without running client JavaScript", async () => {
    const response = await fetch(`${origin}/`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("<title>Antalya profilleri | VIP İlan</title>");
    expect(html).toContain('<link rel="canonical" href="https://cesmebutik.vip/"');
    expect(html).toContain('<meta property="og:url" content="https://cesmebutik.vip/"');
    expect(html).toContain("Özenle keşfet");
    expect(html).toContain("Vika, 27");
    expect(html).toContain("Yayın ilkeleri");
  });

  it("uses listing SEO fields, canonical image URLs, and noindex on a non-indexable profile", async () => {
    const response = await fetch(`${origin}/profil/vika-224`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("<title>Vika | Lara profili</title>");
    expect(html).toContain('<link rel="canonical" href="https://cesmebutik.vip/profil/vika-224"');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(html).toContain('<meta property="og:image" content="https://cesmebutik.vip/uploads/vip-ilan/listings/cover.webp"');
    expect(html).toContain("Özgün açıklama metni.");
  });

  it("keeps an empty category page noindex even when its toggle is enabled", async () => {
    cmsMocks.getPublicCategoryPage.mockResolvedValue({
      category: { id: 2, name: "Örnek kategori", slug: "ornek-kategori", description: "Açıklama", seoTitle: null, seoDescription: null, allowIndexing: true },
      listings: [],
    });
    const response = await fetch(`${origin}/kategori/ornek-kategori`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(html).toContain("Bu sayfada şu anda yayında ilan bulunmuyor.");
  });

  it("returns published URLs from the live sitemap and references it from robots.txt", async () => {
    const [sitemapResponse, robotsResponse] = await Promise.all([fetch(`${origin}/sitemap.xml`), fetch(`${origin}/robots.txt`)]);
    const [sitemap, robots] = await Promise.all([sitemapResponse.text(), robotsResponse.text()]);
    expect(sitemapResponse.status).toBe(200);
    expect(sitemap).toContain("https://cesmebutik.vip/");
    expect(sitemap).toContain("https://cesmebutik.vip/profil/vika-224");
    expect(robotsResponse.status).toBe(200);
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap: https://cesmebutik.vip/sitemap.xml");
  });

  it("uses a real 404 and noindex for unpublished or unknown profiles", async () => {
    listingMocks.getPublicListing.mockResolvedValue(undefined);
    const response = await fetch(`${origin}/profil/taslak-ilan`);
    const html = await response.text();
    expect(response.status).toBe(404);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(html).toContain("İlan bulunamadı");
  });

  it("keeps the admin shell private and does not prerender admin records", async () => {
    const response = await fetch(`${origin}/admin`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(html).not.toContain("Özgün açıklama metni.");
  });
});
