import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { InsertUser, Listing, listings, users } from "../drizzle/schema";
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

function toPublicListing(row: Listing): PublicListing {
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
  };
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
  return rows.map(toPublicListing);
}

export async function getPublicListing(slug: string): Promise<PublicListing | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(listings)
    .where(and(eq(listings.slug, slug), eq(listings.status, "published"))).limit(1);
  return rows[0] ? toPublicListing(rows[0]) : undefined;
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
