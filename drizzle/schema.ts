import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

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
]);

export type Listing = typeof listings.$inferSelect;
export type InsertListing = typeof listings.$inferInsert;
