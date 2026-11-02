import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { categories, InsertUser, Listing, listings, locations, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { storageUrl } from "./storage";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function checkDatabase(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.execute(sql`SELECT 1`);
  return true;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId && ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type ListingWrite = {
  name: string;
  age: number;
  district: string;
  location: string;
  summary: string;
  about: string;
  height: string;
  languages: string[];
  tags: string[];
  imageKeys: string[];
  categoryId: number | null;
  locationId: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  allowIndexing: boolean;
  contactPhone: string | null;
  contactVisible: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  adultConfirmed: boolean;
  imageRightsConfirmed: boolean;
  status: "draft" | "published";
};

export type AdminListing = Omit<Listing, "languagesJson" | "tagsJson" | "imageKeysJson"> & {
  languages: string[];
  tags: string[];
  imageKeys: string[];
  imageUrls: string[];
};

export type PublicListing = {
  slug: string;
  name: string;
  age: number;
  district: string;
  location: string;
  summary: string;
  about: string;
  height: string;
  languages: string[];
  tags: string[];
  images: string[];
  image: string;
  verified: boolean;
  premium: boolean;
  likes: number;
  activity: string;
  contactVisible: boolean;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  locationId: number | null;
  city: string | null;
  citySlug: string | null;
  districtSlug: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  allowIndexing: boolean;
};

function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toAdminListing(row: Listing): AdminListing {
  const { languagesJson, tagsJson, imageKeysJson, ...rest } = row;
  const languages = parseStringArray(languagesJson);
  const tags = parseStringArray(tagsJson);
  const imageKeys = parseStringArray(imageKeysJson);
  return {
    ...rest,
    languages,
    tags,
    imageKeys,
    imageUrls: imageKeys.map(storageUrl),
  };
}

export function toPublicListing(row: Listing): PublicListing {
  const imageKeys = parseStringArray(row.imageKeysJson);
  const images = imageKeys.map(storageUrl);
  return {
    slug: row.slug,
    name: row.name,
    age: row.age,
    district: row.district,
    location: row.location,
    summary: row.summary,
    about: row.about,
    height: row.height,
    languages: parseStringArray(row.languagesJson),
    tags: parseStringArray(row.tagsJson),
    images,
    image: images[0] ?? "",
    verified: row.isVerified,
    premium: row.isFeatured,
    likes: 0,
    activity: "Profil yayında",
    contactVisible: row.contactVisible && Boolean(row.contactPhone),
    categoryId: row.categoryId ?? null,
    categoryName: null,
    categorySlug: null,
    locationId: row.locationId ?? null,
    city: null,
    citySlug: null,
    districtSlug: null,
    seoTitle: row.seoTitle ?? null,
    seoDescription: row.seoDescription ?? null,
    allowIndexing: row.allowIndexing,
  };
}

async function enrichPublicListings(rows: Listing[]): Promise<PublicListing[]> {
  if (!rows.length) return [];
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const categoryIds = [...new Set(rows.flatMap((row) => row.categoryId ? [row.categoryId] : []))];
  const locationIds = [...new Set(rows.flatMap((row) => row.locationId ? [row.locationId] : []))];
  const [categoryRows, locationRows] = await Promise.all([
    categoryIds.length ? db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories).where(and(inArray(categories.id, categoryIds), eq(categories.isActive, true))) : Promise.resolve([]),
    locationIds.length ? db.select({ id: locations.id, city: locations.city, citySlug: locations.citySlug, districtSlug: locations.districtSlug }).from(locations).where(and(inArray(locations.id, locationIds), eq(locations.isActive, true))) : Promise.resolve([]),
  ]);
  const categoryById = new Map(categoryRows.map((row) => [row.id, row]));
  const locationById = new Map(locationRows.map((row) => [row.id, row]));
  return rows.map((row) => {
    const profile = toPublicListing(row);
    const category = row.categoryId ? categoryById.get(row.categoryId) : undefined;
    const location = row.locationId ? locationById.get(row.locationId) : undefined;
    return {
      ...profile,
      location: location?.city ?? profile.location,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      city: location?.city ?? null,
      citySlug: location?.citySlug ?? null,
      districtSlug: location?.districtSlug ?? null,
    };
  });
}

function slugify(value: string) {
  const base = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150);
  return `${base || "ilan"}-${nanoid(7).toLowerCase()}`;
}

function writeValues(input: ListingWrite, publishedAt: Date | null) {
  return {
    name: input.name.trim(),
    age: input.age,
    district: input.district.trim(),
    location: input.location.trim(),
    summary: input.summary.trim(),
    about: input.about.trim(),
    height: input.height.trim() || "Belirtilmedi",
    languagesJson: JSON.stringify(input.languages),
    tagsJson: JSON.stringify(input.tags),
    imageKeysJson: JSON.stringify(input.imageKeys),
    categoryId: input.categoryId,
    locationId: input.locationId,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    allowIndexing: input.allowIndexing,
    contactPhone: input.contactPhone?.trim() || null,
    contactVisible: Boolean(input.contactVisible && input.contactPhone?.trim()),
    isVerified: input.isVerified,
    isFeatured: input.isFeatured,
    adultConfirmed: input.adultConfirmed,
    imageRightsConfirmed: input.imageRightsConfirmed,
    status: input.status,
    publishedAt,
  };
}

export async function getPublicListings(): Promise<PublicListing[]> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(listings)
    .where(eq(listings.status, "published"))
    .orderBy(desc(listings.isFeatured), desc(listings.publishedAt), desc(listings.updatedAt));
  return enrichPublicListings(rows);
}

export async function getPublicListingsByCategoryId(categoryId: number): Promise<PublicListing[]> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(listings)
    .where(and(eq(listings.status, "published"), eq(listings.categoryId, categoryId)))
    .orderBy(desc(listings.isFeatured), desc(listings.publishedAt), desc(listings.updatedAt));
  return enrichPublicListings(rows);
}

export async function getPublicListingsByLocationIds(locationIds: number[]): Promise<PublicListing[]> {
  if (!locationIds.length) return [];
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(listings)
    .where(and(eq(listings.status, "published"), inArray(listings.locationId, locationIds)))
    .orderBy(desc(listings.isFeatured), desc(listings.publishedAt), desc(listings.updatedAt));
  return enrichPublicListings(rows);
}

export async function getPublicListing(slug: string): Promise<PublicListing | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(listings)
    .where(and(eq(listings.slug, slug), eq(listings.status, "published"))).limit(1);
  return rows[0] ? (await enrichPublicListings(rows))[0] : undefined;
}

export async function getPublicContact(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({ contactPhone: listings.contactPhone, contactVisible: listings.contactVisible })
    .from(listings)
    .where(and(eq(listings.slug, slug), eq(listings.status, "published"))).limit(1);
  const row = rows[0];
  return row?.contactVisible ? row.contactPhone : null;
}

export async function getAdminListings(): Promise<AdminListing[]> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(listings).orderBy(desc(listings.updatedAt));
  return rows.map(toAdminListing);
}

export async function createListing(input: ListingWrite): Promise<AdminListing> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const slug = slugify(input.name);
  await db.insert(listings).values({ slug, ...writeValues(input, input.status === "published" ? new Date() : null) });
  const rows = await db.select().from(listings).where(eq(listings.slug, slug)).limit(1);
  if (!rows[0]) throw new Error("Created listing could not be loaded");
  return toAdminListing(rows[0]);
}

export async function updateListing(id: number, input: ListingWrite): Promise<AdminListing | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!existing[0]) return undefined;
  const publishedAt = input.status === "published" ? (existing[0].publishedAt ?? new Date()) : null;
  await db.update(listings).set(writeValues(input, publishedAt)).where(eq(listings.id, id));
  const rows = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  return rows[0] ? toAdminListing(rows[0]) : undefined;
}

export async function archiveListing(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(listings).set({ status: "archived", publishedAt: null }).where(eq(listings.id, id));
  return true;
}

export async function getAdminListingById(id: number): Promise<AdminListing | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  return rows[0] ? toAdminListing(rows[0]) : undefined;
}

export async function appendListingImageKey(id: number, key: string): Promise<AdminListing | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!existing[0] || existing[0].status === "archived") return undefined;
  const currentKeys = parseStringArray(existing[0].imageKeysJson);
  if (currentKeys.includes(key)) return toAdminListing(existing[0]);
  if (currentKeys.length >= 12) throw new Error("An ilan en fazla 12 fotoğraf içerebilir.");
  await db.update(listings).set({ imageKeysJson: JSON.stringify([...currentKeys, key]), status: "draft", publishedAt: null }).where(eq(listings.id, id));
  const rows = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  return rows[0] ? toAdminListing(rows[0]) : undefined;
}
