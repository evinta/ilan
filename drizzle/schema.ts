import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const listings = mysqlTable("listings", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  age: int("age").notNull(),
  district: varchar("district", { length: 80 }).notNull(),
  location: varchar("location", { length: 160 }).notNull(),
  summary: varchar("summary", { length: 420 }).notNull(),
  about: text("about").notNull(),
  height: varchar("height", { length: 32 }).notNull().default("Belirtilmedi"),
  languagesJson: text("languagesJson").notNull(),
  tagsJson: text("tagsJson").notNull(),
  imageKeysJson: text("imageKeysJson").notNull(),
  categoryId: int("categoryId"),
  locationId: int("locationId"),
  seoTitle: varchar("seoTitle", { length: 180 }),
  seoDescription: varchar("seoDescription", { length: 320 }),
  allowIndexing: boolean("allowIndexing").default(true).notNull(),
  contactPhone: varchar("contactPhone", { length: 40 }),
  contactVisible: boolean("contactVisible").default(false).notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  adultConfirmed: boolean("adultConfirmed").default(false).notNull(),
  imageRightsConfirmed: boolean("imageRightsConfirmed").default(false).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("listings_status_published_idx").on(table.status, table.publishedAt),
  index("listings_district_status_idx").on(table.district, table.status),
  index("listings_category_status_idx").on(table.categoryId, table.status),
  index("listings_location_status_idx").on(table.locationId, table.status),
]);

export type Listing = typeof listings.$inferSelect;
export type InsertListing = typeof listings.$inferInsert;

export const siteSettings = mysqlTable("site_settings", {
  id: int("id").primaryKey(),
  siteName: varchar("siteName", { length: 120 }).notNull(),
  homeTitle: varchar("homeTitle", { length: 180 }).notNull(),
  homeDescription: text("homeDescription").notNull(),
  heroEyebrow: varchar("heroEyebrow", { length: 80 }).notNull(),
  heroHeading: varchar("heroHeading", { length: 220 }).notNull(),
  heroBody: text("heroBody").notNull(),
  defaultSeoTitle: varchar("defaultSeoTitle", { length: 180 }).notNull(),
  defaultSeoDescription: varchar("defaultSeoDescription", { length: 320 }).notNull(),
  defaultSocialImage: varchar("defaultSocialImage", { length: 500 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const navigationItems = mysqlTable("navigation_items", {
  id: int("id").autoincrement().primaryKey(),
  placement: mysqlEnum("placement", ["header", "footer"]).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  href: varchar("href", { length: 500 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("navigation_placement_order_idx").on(table.placement, table.sortOrder)]);

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  description: text("description").notNull(),
  seoTitle: varchar("seoTitle", { length: 180 }),
  seoDescription: varchar("seoDescription", { length: 320 }),
  allowIndexing: boolean("allowIndexing").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("categories_active_order_idx").on(table.isActive, table.sortOrder)]);

export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  city: varchar("city", { length: 120 }).notNull(),
  citySlug: varchar("citySlug", { length: 140 }).notNull(),
  district: varchar("district", { length: 120 }).notNull(),
  districtSlug: varchar("districtSlug", { length: 140 }).notNull(),
  description: text("description").notNull(),
  seoTitle: varchar("seoTitle", { length: 180 }),
  seoDescription: varchar("seoDescription", { length: 320 }),
  allowIndexing: boolean("allowIndexing").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("locations_city_district_slug_unique").on(table.citySlug, table.districtSlug),
  index("locations_active_order_idx").on(table.isActive, table.sortOrder),
]);

export const contentPages = mysqlTable("content_pages", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 180 }).notNull(),
  summary: varchar("summary", { length: 320 }).notNull(),
  body: text("body").notNull(),
  seoTitle: varchar("seoTitle", { length: 180 }),
  seoDescription: varchar("seoDescription", { length: 320 }),
  allowIndexing: boolean("allowIndexing").default(true).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("content_pages_status_published_idx").on(table.status, table.publishedAt)]);
