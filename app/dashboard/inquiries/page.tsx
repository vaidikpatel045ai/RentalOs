import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { InquiryStatusSelect } from "@/components/domain/inquiry-status-select";
import { parsePagination } from "@/lib/pagination";
import { enumOptions } from "@/lib/format-enum";
import type { InquiryStatus } from "@prisma/client";

const INQUIRY_STATUSES: InquiryStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO_SCHEDULED",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; pageSize?: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    redirect("/dashboard");
  }

  const { q, status, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);

  const where = {
    ...(status ? { status: status as InquiryStatus } : {}),
    ...(q
      ? {
          OR: [
            { businessName: { contains: q, mode: "insensitive" as const } },
            { contactName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [inquiries, totalCount] = await Promise.all([
    db.salesInquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    db.salesInquiry.count({ where }),
  ]);

  const filters: FilterConfig[] = [{ key: "status", label: "Status", options: enumOptions(INQUIRY_STATUSES) }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Inquiries</h1>
        <p className="text-sm text-muted-foreground">{totalCount} demo requests from the marketing site</p>
      </div>

      <FilterBar searchKey="q" searchPlaceholder="Search business, contact, email…" filters={filters} />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Branches</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      No inquiries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  inquiries.map((inq) => (
                    <TableRow key={inq.id}>
                      <TableCell className="font-medium">{inq.businessName}</TableCell>
                      <TableCell className="text-muted-foreground">{inq.contactName}</TableCell>
                      <TableCell className="text-muted-foreground">{inq.email}</TableCell>
                      <TableCell className="text-muted-foreground">{inq.phone ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{inq.city ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{inq.branchCount ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{inq.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <InquiryStatusSelect inquiryId={inq.id} status={inq.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="inquiries" />
    </div>
  );
}
