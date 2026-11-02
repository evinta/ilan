import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export type ListingOutputs = inferRouterOutputs<AppRouter>;
export type Profile = ListingOutputs["listings"]["publicList"][number];
export type AdminListing = ListingOutputs["listings"]["adminList"][number];
