-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "isCommunity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceRecipeId" TEXT;

-- CreateIndex
CREATE INDEX "Recipe_isCommunity_category_idx" ON "Recipe"("isCommunity", "category");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_sourceRecipeId_fkey" FOREIGN KEY ("sourceRecipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
