import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  categories,
  contentPages,
  listings,
  locations,
  navigationItems,
  siteSettings,
} from "../../drizzle/schema";
import {
  getPublicListingsByCategoryId,
  getPublicListingsByLocationIds,
  type PublicListing,
} from "../db";
import { getDb } from "../db";

export const DEFAULT_SITE_SETTINGS = {
  id: 1,
  siteName: "VIP İlan",
  homeTitle: "Antalya'dan seçkiler | VIP İlan",
  homeDescription: "Antalya'daki seçilmiş profilleri özenli ve güven odaklı bir vitrinde keşfet.",
  heroEyebrow: "ANTALYA'DAN SEÇKİLER",
  heroHeading: "Şehrin ritminde, özenle keşfet.",
  heroBody: "Antalya'nın farklı noktalarından seçilmiş profilleri tek bir yerde incele. Açık bilgi, özenli sunum ve saygılı iletişim.",
  defaultSeoTitle: "VIP İlan — Antalya'dan Seçkiler",
  defaultSeoDescription: "Antalya'daki seçilmiş profilleri özenli ve güven odaklı bir vitrinde keşfet. VIP İlan — 18+ yetişkin ziyaretçiler içindir.",
  defaultSocialImage: null,
};

export type SiteSettingsInput = {
  siteName: string;
  homeTitle: string;
  homeDescription: string;
  heroEyebrow: string;
  heroHeading: string;
  heroBody: string;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  defaultSocialImage: string | null;
};

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function getSiteSettings() {
  const db = await requireDb();
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  return rows[0] ?? { ...DEFAULT_SITE_SETTINGS, updatedAt: new Date(0) };
}

export async function updateSiteSettings(input: SiteSettingsInput) {
  const db = await requireDb();
  await db.insert(siteSettings).values({ id: 1, ...input })
    .onDuplicateKeyUpdate({ set: input });
  return getSiteSettings();
}

export async function getPublicLayout() {
  const db = await requireDb();
  const [settings, header, footer, activeCategories, activeLocations] = await Promise.all([
    getSiteSettings(),
    db.select().from(navigationItems).where(and(eq(navigationItems.placement, "header"), eq(navigationItems.isActive, true))).orderBy(asc(navigationItems.sortOrder), asc(navigationItems.id)),
    db.select().from(navigationItems).where(and(eq(navigationItems.placement, "footer"), eq(navigationItems.isActive, true))).orderBy(asc(navigationItems.sortOrder), asc(navigationItems.id)),
    db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder), asc(categories.id)),
    db.select().from(locations).where(eq(locations.isActive, true)).orderBy(asc(locations.sortOrder), asc(locations.id)),
  ]);
  return {
    settings: {
      siteName: settings.siteName,
      homeTitle: settings.homeTitle,
      homeDescription: settings.homeDescription,
      heroEyebrow: settings.heroEyebrow,
      heroHeading: settings.heroHeading,
      heroBody: settings.heroBody,
      defaultSeoTitle: settings.defaultSeoTitle,
      defaultSeoDescription: settings.defaultSeoDescription,
      defaultSocialImage: settings.defaultSocialImage,
    },
    header,
    footer,
    categories: activeCategories,
    locations: activeLocations,
  };
}

export async function getAdminCmsLists() {
  const db = await requireDb();
  const [settings, header, footer, allCategories, allLocations, pages] = await Promise.all([
    getSiteSettings(),
    db.select().from(navigationItems).where(eq(navigationItems.placement, "header")).orderBy(asc(navigationItems.sortOrder), asc(navigationItems.id)),
    db.select().from(navigationItems).where(eq(navigationItems.placement, "footer")).orderBy(asc(navigationItems.sortOrder), asc(navigationItems.id)),
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
    db.select().from(locations).orderBy(asc(locations.sortOrder), asc(locations.id)),
    db.select().from(contentPages).orderBy(desc(contentPages.updatedAt)),
  ]);
  return { settings, navigation: { header, footer }, categories: allCategories, locations: allLocations, pages };
}

export async function getAdminListingOptions() {
  const db = await requireDb();
  const [activeCategories, activeLocations] = await Promise.all([
    db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories)
      .where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder), asc(categories.id)),
    db.select({ id: locations.id, city: locations.city, citySlug: locations.citySlug, district: locations.district, districtSlug: locations.districtSlug })
      .from(locations).where(eq(locations.isActive, true)).orderBy(asc(locations.sortOrder), asc(locations.id)),
  ]);
  return { categories: activeCategories, locations: activeLocations };
}

export async function saveNavigationItem(input: {
  id?: number;
  placement: "header" | "footer";
  label: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
}) {
  const db = await requireDb();
  const { id, ...data } = input;
  if (id) await db.update(navigationItems).set(data).where(eq(navigationItems.id, id));
  else await db.insert(navigationItems).values(data);
  return getAdminCmsLists();
}

export async function setNavigationItemActive(id: number, isActive: boolean) {
  const db = await requireDb();
  await db.update(navigationItems).set({ isActive }).where(eq(navigationItems.id, id));
  return true;
}

export type CategoryInput = {
  id?: number;
  name: string;
  slug: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  allowIndexing: boolean;
  sortOrder: number;
  isActive: boolean;
};

export async function saveCategory(input: CategoryInput) {
  const db = await requireDb();
  const { id, ...data } = input;
  if (id) await db.update(categories).set(data).where(eq(categories.id, id));
  else await db.insert(categories).values(data);
  return getAdminCmsLists();
}

export async function setCategoryActive(id: number, isActive: boolean) {
  const db = await requireDb();
  await db.update(categories).set({ isActive }).where(eq(categories.id, id));
  return true;
}

export type LocationInput = {
  id?: number;
  city: string;
  citySlug: string;
  district: string;
  districtSlug: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  allowIndexing: boolean;
  sortOrder: number;
  isActive: boolean;
};

export async function saveLocation(input: LocationInput) {
  const db = await requireDb();
  const { id, ...data } = input;
  if (id) await db.update(locations).set(data).where(eq(locations.id, id));
  else await db.insert(locations).values(data);
  return getAdminCmsLists();
}

export async function setLocationActive(id: number, isActive: boolean) {
  const db = await requireDb();
  await db.update(locations).set({ isActive }).where(eq(locations.id, id));
  return true;
}

export type ContentPageInput = {
  id?: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  allowIndexing: boolean;
  status: "draft" | "published";
};

export async function saveContentPage(input: ContentPageInput) {
  const db = await requireDb();
  const { id, ...data } = input;
  if (id) {
    const existing = await db.select().from(contentPages).where(eq(contentPages.id, id)).limit(1);
    const publishedAt = input.status === "published" ? (existing[0]?.publishedAt ?? new Date()) : null;
    await db.update(contentPages).set({ ...data, publishedAt }).where(eq(contentPages.id, id));
  } else {
    await db.insert(contentPages).values({ ...data, publishedAt: input.status === "published" ? new Date() : null });
  }
  return getAdminCmsLists();
}

export async function archiveContentPage(id: number) {
  const db = await requireDb();
  await db.update(contentPages).set({ status: "archived", publishedAt: null }).where(eq(contentPages.id, id));
  return true;
}

export async function getPublicCategoryPage(slug: string): Promise<{ category: typeof categories.$inferSelect; listings: PublicListing[] } | undefined> {
  const db = await requireDb();
  const rows = await db.select().from(categories).where(and(eq(categories.slug, slug), eq(categories.isActive, true))).limit(1);
  const category = rows[0];
  if (!category) return undefined;
  return { category, listings: await getPublicListingsByCategoryId(category.id) };
}

export async function getPublicLocationPage(citySlug: string, districtSlug?: string): Promise<{
  city: string;
  citySlug: string;
  district: string | null;
  districtSlug: string | null;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  allowIndexing: boolean;
  locations: typeof locations.$inferSelect[];
  listings: PublicListing[];
} | undefined> {
  const db = await requireDb();
  const conditions = [eq(locations.citySlug, citySlug), eq(locations.isActive, true)];
  if (districtSlug) conditions.push(eq(locations.districtSlug, districtSlug));
  const records = await db.select().from(locations).where(and(...conditions)).orderBy(asc(locations.sortOrder), asc(locations.id));
  if (!records.length) return undefined;
  const first = records[0]!;
  const locationIds = records.map((row) => row.id);
  const visibleListings = await getPublicListingsByLocationIds(locationIds);
  return {
    city: first.city,
    citySlug: first.citySlug,
    district: districtSlug ? first.district : null,
    districtSlug: districtSlug ? first.districtSlug : null,
    description: districtSlug ? first.description : `${first.city} şehrindeki yayınlanmış ilanları inceleyin.`,
    seoTitle: districtSlug ? first.seoTitle : null,
    seoDescription: districtSlug ? first.seoDescription : null,
    allowIndexing: visibleListings.length > 0 && (districtSlug ? first.allowIndexing : records.some((row) => row.allowIndexing)),
    locations: records,
    listings: visibleListings,
  };
}

export async function getPublicContentPage(slug: string) {
  const db = await requireDb();
  const rows = await db.select().from(contentPages).where(and(eq(contentPages.slug, slug), eq(contentPages.status, "published"))).limit(1);
  return rows[0];
}

export async function getPublicSitemapData() {
  const db = await requireDb();
  const [publicListings, activeCategories, activeLocations, pages] = await Promise.all([
    db.select({ slug: listings.slug, updatedAt: listings.updatedAt, categoryId: listings.categoryId, locationId: listings.locationId }).from(listings)
      .where(and(eq(listings.status, "published"), eq(listings.allowIndexing, true))),
    db.select().from(categories).where(and(eq(categories.isActive, true), eq(categories.allowIndexing, true))),
    db.select().from(locations).where(and(eq(locations.isActive, true), eq(locations.allowIndexing, true))),
    db.select().from(contentPages).where(and(eq(contentPages.status, "published"), eq(contentPages.allowIndexing, true))),
  ]);
  const categoryIds = new Set(publicListings.map((item) => item.categoryId).filter((id): id is number => id !== null));
  const locationIds = new Set(publicListings.map((item) => item.locationId).filter((id): id is number => id !== null));
  return {
    listings: publicListings,
    categories: activeCategories.filter((item) => categoryIds.has(item.id)),
    locations: activeLocations.filter((item) => locationIds.has(item.id)),
    pages: pages.filter((item) => item.summary.trim().length > 0 || item.body.trim().length > 0),
  };
}

export async function getCategoryById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(categories).where(and(eq(categories.id, id), eq(categories.isActive, true))).limit(1);
  return rows[0];
}

export async function getLocationById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(locations).where(and(eq(locations.id, id), eq(locations.isActive, true))).limit(1);
  return rows[0];
}
