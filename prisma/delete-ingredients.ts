// delete-ingredients.ts
import { PrismaClient } from "../generated/prisma"
const db = new PrismaClient()
async function main() {
  const { count } = await db.ingredient.deleteMany({})
  console.log(`Eliminados ${count} ingredientes`)
}
main().finally(() => db.$disconnect())