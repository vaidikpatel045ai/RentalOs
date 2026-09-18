"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Branch } from "@prisma/client";

const ALL_BRANCHES = "__all__";

export function BranchSwitcher({
  branches,
  activeBranchId,
  basePath,
  allowAll = false,
}: {
  branches: Branch[];
  /** Omit (or pass undefined) to represent "All Branches" when allowAll is true. */
  activeBranchId?: string;
  basePath: string;
  allowAll?: boolean;
}) {
  const router = useRouter();

  return (
    <Select
      value={activeBranchId ?? ALL_BRANCHES}
      onValueChange={(v) => router.push(v === ALL_BRANCHES ? basePath : `${basePath}?branchId=${v}`)}
    >
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL_BRANCHES}>All Branches</SelectItem>}
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
