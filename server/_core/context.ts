import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const now = new Date();
const DEV_FALLBACK_USER: User = {
  id: 1,
  openId: "dev-fallback",
  name: "Dev User",
  email: null,
  loginMethod: null,
  role: "user",
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user && !ENV.isProduction) {
    user = DEV_FALLBACK_USER;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
