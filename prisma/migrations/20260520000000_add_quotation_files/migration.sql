CREATE TYPE "QuotationFileType" AS ENUM ('LINNEN', 'AMMENITIES', 'DIVERSY', 'ECOGENIS', 'KHARCHER');

CREATE TABLE "QuotationFile" (
    "id" TEXT NOT NULL,
    "type" "QuotationFileType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "cloudinaryResource" TEXT,
    "originalFilename" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuotationFile_type_idx" ON "QuotationFile"("type");
CREATE INDEX "QuotationFile_createdAt_idx" ON "QuotationFile"("createdAt");
