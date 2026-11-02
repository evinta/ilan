import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";
import { LOCAL_ADMIN_OPEN_ID, LOCAL_SESSION_COOKIE, clearLoginFailures, createLocalSessionToken, isLoginBlocked, recordFailedLogin, verifyConfiguredAdminCredentials } from "./_core/local-auth";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";

const listingInput = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.number().int().min(18).max(99),
  district: z.string().trim().min(1).max(80),
  location: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(420),
  about: z.string().trim().min(1).max(8000),
  height: z.string().trim().max(32).default("Belirtilmedi"),
  languages: z.array(z.string().trim().min(1).max(40)).max(12),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  imageKeys: z.array(z.string().regex(/^vip-ilan\/listings\/[A-Za-z0-9._-]+$/)).max(12),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  contactVisible: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  adultConfirmed: z.boolean(),
  imageRightsConfirmed: z.boolean(),
  status: z.enum(["draft", "published"]),
}).superRefine((value, context) => {
  if (value.contactVisible && !value.contactPhone?.trim()) {
    context.addIssue({ code: "custom", path: ["contactPhone"], message: "İletişimi göstermek için telefon numarası girin." });
  }
  if (value.status === "published") {
    if (!value.adultConfirmed) context.addIssue({ code: "custom", path: ["adultConfirmed"], message: "Yayın için 18+ beyanı gereklidir." });
    if (!value.imageRightsConfirmed) context.addIssue({ code: "custom", path: ["imageRightsConfirmed"], message: "Yayın için görsel kullanım izni beyanı gereklidir." });
    if (value.imageKeys.length === 0) context.addIssue({ code: "custom", path: ["imageKeys"], message: "Yayın için en az bir fotoğraf ekleyin." });
  }
});

type ListingInput = z.infer<typeof listingInput>;

function toListingWrite(input: ListingInput): db.ListingWrite {
  return {
    ...input,
    contactPhone: input.contactPhone?.trim() || null,
    height: input.height || "Belirtilmedi",
  };
}

function publicUploadError(error: unknown): never {
  console.error("[Listings] Storage upload failed", error instanceof Error ? error.message : "unknown error");
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Fotoğraf depolamaya yüklenemedi. Ayarları ve bağlantıyı kontrol edip tekrar deneyin." });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    login: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(256) })).mutation(async ({ ctx, input }) => {
      if (ENV.authProvider !== "local") throw new TRPCError({ code: "NOT_FOUND", message: "Bu giriş yöntemi etkin değil." });
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      if (isLoginBlocked(ip)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin." });
      if (!verifyConfiguredAdminCredentials(input.email, input.password)) {
        recordFailedLogin(ip);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-posta veya şifre hatalı." });
      }
      clearLoginFailures(ip);
      await db.upsertUser({ openId: LOCAL_ADMIN_OPEN_ID, name: "Yönetici", email: ENV.adminEmail, loginMethod: "password", role: "admin", lastSignedIn: new Date() });
      const token = await createLocalSessionToken();
      ctx.res.cookie(LOCAL_SESSION_COOKIE, token, { ...getSessionCookieOptions(ctx.req, "local"), maxAge: 12 * 60 * 60 * 1000 });
      return { success: true } as const;
    }),
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const isLocal = ENV.authProvider === "local";
      const cookieOptions = getSessionCookieOptions(ctx.req, isLocal ? "local" : "manus");
      ctx.res.clearCookie(isLocal ? LOCAL_SESSION_COOKIE : COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  listings: router({
    publicList: publicProcedure.query(() => db.getPublicListings()),
    publicDetail: publicProcedure.input(z.object({ slug: z.string().min(1).max(180) })).query(async ({ input }) => {
      const listing = await db.getPublicListing(input.slug);
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Bu ilan yayında değil veya bulunamadı." });
      return listing;
    }),
    publicContact: publicProcedure.input(z.object({ slug: z.string().min(1).max(180) })).mutation(async ({ input }) => {
      const phone = await db.getPublicContact(input.slug);
      if (!phone) throw new TRPCError({ code: "NOT_FOUND", message: "Bu ilanda herkese açık iletişim bilgisi bulunmuyor." });
      return { phone };
    }),
    adminList: adminProcedure.query(() => db.getAdminListings()),
    create: adminProcedure.input(listingInput).mutation(({ input }) => db.createListing(toListingWrite(input))),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: listingInput })).mutation(({ input }) => db.updateListing(input.id, toListingWrite(input.data))),
    archive: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.archiveListing(input.id)),
    uploadListingImage: adminProcedure.input(z.object({ listingId: z.number().int().positive(), fileName: z.string().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataBase64: z.string().min(1).max(7_000_000) })).mutation(async ({ input }) => {
      const listing = await db.getAdminListingById(input.listingId);
      if (!listing || listing.status === "archived") throw new TRPCError({ code: "NOT_FOUND", message: "Fotoğraf eklenecek taslak bulunamadı." });
      if (listing.imageKeys.length >= 12) throw new TRPCError({ code: "BAD_REQUEST", message: "Bir ilana en fazla 12 fotoğraf eklenebilir." });
      const extByMime = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
      const buffer = Buffer.from(input.dataBase64, "base64");
      if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Fotoğraf boş olamaz ve 5 MB'tan küçük olmalıdır." });
      }
      const validSignature = input.mimeType === "image/jpeg"
        ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        : input.mimeType === "image/png"
          ? buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
          : buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
      if (!validSignature) throw new TRPCError({ code: "BAD_REQUEST", message: "Dosya içeriği, seçilen görsel türüyle eşleşmiyor." });
      try {
        const upload = await storagePut(`vip-ilan/listings/${nanoid(18)}.${extByMime[input.mimeType]}`, buffer, input.mimeType);
        const attached = await db.appendListingImageKey(listing.id, upload.key);
        if (!attached) throw new TRPCError({ code: "NOT_FOUND", message: "Taslak fotoğraf yüklenirken bulunamadı." });
        return { key: upload.key, url: upload.url };
      } catch (error) {
        return publicUploadError(error);
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
