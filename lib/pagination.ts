export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 25;

export interface PaginationParams {
  page: number;
  pageSize: PageSize;
  skip: number;
  take: number;
}

function clampPageSize(value: number): PageSize {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value) ? (value as PageSize) : DEFAULT_PAGE_SIZE;
}

/** Reads `?page=&pageSize=` from a server component's searchParams and
 * turns them into safe, clamped Prisma `skip`/`take` values. Shared by
 * every paginated list screen so the URL contract (and defaults) never
 * drift between pages. */
export function parsePagination(searchParams: { page?: string; pageSize?: string }): PaginationParams {
  const pageSize = clampPageSize(Number(searchParams.pageSize) || DEFAULT_PAGE_SIZE);
  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function getTotalPages(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
