import path from "node:path";

const validProvider = (value: string | undefined, fallback: "manus" | "local") => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === "manus" || normalized === "local") return normalized;
  throw new Error("AUTH_PROVIDER and STORAGE_PROVIDER must be 'manus' or 'local'");
};

export const ENV = {
  get authProvider() { return validProvider(process.env.AUTH_PROVIDER, "manus"); },
  get storageProvider() {
    return validProvider(process.env.STORAGE_PROVIDER, this.authProvider === "local" ? "local" : "manus");
  },
  get appId() { return process.env.MANUS_PROJECT_ID ?? ""; },
  get cookieSecret() { return process.env.MANUS_JWT_SECRET ?? ""; },
  get sessionSecret() { return process.env.SESSION_SECRET ?? ""; },
  get databaseUrl() { return process.env.DATABASE_URL ?? ""; },
  get oAuthServerUrl() { return process.env.MANUS_OAUTH_API_URL ?? ""; },
  get ownerOpenId() { return process.env.OWNER_OPEN_ID ?? ""; },
  get adminEmail() { return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? ""; },
  get adminPassword() { return process.env.ADMIN_PASSWORD ?? ""; },
  get publicSiteUrl() { return process.env.PUBLIC_SITE_URL?.trim() ?? ""; },
  get dataDir() {
    return path.resolve(process.env.DATA_DIR || (this.authProvider === "local" ? "/data" : "./data"));
  },
  get uploadDir() { return path.resolve(process.env.UPLOAD_DIR || path.join(this.dataDir, "uploads")); },
  get isProduction() { return process.env.NODE_ENV === "production"; },
  get forgeApiUrl() { return process.env.MANUS_API_URL ?? ""; },
  get forgeApiKey() { return process.env.MANUS_API_KEY ?? ""; },
};
