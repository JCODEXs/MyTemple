-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Ingredient_createdByUserId_idx" ON "Ingredient"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
