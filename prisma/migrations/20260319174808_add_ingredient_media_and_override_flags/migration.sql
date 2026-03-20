-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "UserIngredientOverride" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "customPricePerKg" DROP NOT NULL;
