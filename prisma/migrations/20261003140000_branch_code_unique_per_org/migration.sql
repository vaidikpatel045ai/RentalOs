-- Branch codes are unique per organization, not platform-wide, so two
-- boutiques can both have a "DXB" branch.
DROP INDEX "branches_code_key";

CREATE UNIQUE INDEX "branches_organizationId_code_key" ON "branches"("organizationId", "code");
