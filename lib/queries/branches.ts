import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

/**
 * Branches change extremely rarely (opening a new market is a deliberate,
 * occasional admin action) but `db.branch.findUnique` for the signed-in
 * user's own branch runs on every single dashboard page load, for every
 * branch-scoped staff member — the highest-frequency branch query in the
 * app by a wide margin. A long cache window is safe here; branch edits go
 * through `revalidateTag("branches")` so changes still show up immediately.
 */
const BRANCHES_REVALIDATE_SECONDS = 600;

export const getCachedBranchById = unstable_cache(
  (id: string) => db.branch.findUnique({ where: { id } }),
  ["branch-by-id"],
  { revalidate: BRANCHES_REVALIDATE_SECONDS, tags: ["branches"] }
);

export const getCachedBranches = unstable_cache(
  () => db.branch.findMany({ orderBy: { name: "asc" } }),
  ["branches-list"],
  { revalidate: BRANCHES_REVALIDATE_SECONDS, tags: ["branches"] }
);
