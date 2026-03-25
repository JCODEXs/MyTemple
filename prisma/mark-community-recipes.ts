import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()

async function main() {
  const adminUser = await db.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
  })

  if (!adminUser) {
    console.error("No admin user found")
    return
  }

  const result = await db.recipe.updateMany({
    where: { userId: adminUser.id },
    data:  { isCommunity: true },
  })

  console.log(`✅ Marked ${result.count} recipes as community (from ${adminUser.email})`)
}

main().catch(console.error).finally(() => db.$disconnect())

// Run with: npx tsx prisma/mark-community-recipes.ts
