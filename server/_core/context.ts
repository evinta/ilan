import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { getLocalSessionUser } from "./local-auth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = ENV.authProvider === "local"
      ? await getLocalSessionUser(opts.req)
      : await sdk.authenticateRequest(opts.req);
  } catch {
    // Authentication is optional for public procedures; private procedures still reject null users.
    user = null;
  }
  return { req: opts.req, res: opts.res, user };
}
