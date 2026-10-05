-- Packages can be saved as drafts; price is optional until published.
ALTER TABLE "packages" ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "price" DROP NOT NULL;
