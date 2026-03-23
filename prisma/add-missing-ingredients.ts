// prisma/add-missing-ingredients.ts
import { PrismaClient } from "../generated/prisma"
import { readFileSync } from 'fs'

const db = new PrismaClient()

// Lista de ingredientes que faltaron según los logs
const missingIngredientsFromLogs = [
  "Frijoles cocidos",
  "Aceite de oliva",
  "Arroz blanco",
  "Cebolla cabezona",
  "Pechuga de pollo",
  "Queso blanco",
  "Lentejas",
  "Plátano verde",
  "Carne molida",
  "Papa pastusa",
  "Arroz integral",
  "Batata / Camote",
  "Atún en lata",
  "Garbanzos cocidos",
  "Yogur griego",
  "Salmón",
  "Pasta integral",
  "Mantequilla de maní",
  "Fresa",
  "Piña",
]

// Información nutricional para cada ingrediente faltante
const missingIngredientsData: Array<{
  name: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number
  sodiumMgPer100g?: number
  defaultPricePerKg?: number
  emoji: string
  imageUrl: string
}> = [
  // Granos y cereales
  {
    name: "Arroz blanco",
    kcalPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28.2,
    fatPer100g: 0.3,
    fiberPer100g: 0.4,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 3000,
    emoji: "🍚",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Arroz+blanco",
  },
  {
    name: "Arroz integral",
    kcalPer100g: 123,
    proteinPer100g: 2.7,
    carbsPer100g: 25.6,
    fatPer100g: 1.0,
    fiberPer100g: 1.8,
    sodiumMgPer100g: 5,
    defaultPricePerKg: 4500,
    emoji: "🍚",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Arroz+integral",
  },
  {
    name: "Pasta integral",
    kcalPer100g: 158,
    proteinPer100g: 5.8,
    carbsPer100g: 30.9,
    fatPer100g: 0.9,
    fiberPer100g: 1.8,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 6000,
    emoji: "🍝",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Pasta+integral",
  },

  // Legumbres
  {
    name: "Frijoles cocidos",
    kcalPer100g: 132,
    proteinPer100g: 8.9,
    carbsPer100g: 23.7,
    fatPer100g: 0.5,
    fiberPer100g: 8.7,
    sodiumMgPer100g: 2,
    defaultPricePerKg: 4500,
    emoji: "🫘",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Frijoles+cocidos",
  },
  {
    name: "Lentejas",
    kcalPer100g: 116,
    proteinPer100g: 9.0,
    carbsPer100g: 20.1,
    fatPer100g: 0.4,
    fiberPer100g: 7.9,
    sodiumMgPer100g: 2,
    defaultPricePerKg: 5500,
    emoji: "🫘",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Lentejas",
  },
  {
    name: "Garbanzos cocidos",
    kcalPer100g: 164,
    proteinPer100g: 8.9,
    carbsPer100g: 27.4,
    fatPer100g: 2.6,
    fiberPer100g: 7.6,
    sodiumMgPer100g: 7,
    defaultPricePerKg: 5000,
    emoji: "🫘",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Garbanzos+cocidos",
  },

  // Verduras y tubérculos
  {
    name: "Cebolla cabezona",
    kcalPer100g: 40,
    proteinPer100g: 1.1,
    carbsPer100g: 9.3,
    fatPer100g: 0.1,
    fiberPer100g: 1.7,
    sodiumMgPer100g: 4,
    defaultPricePerKg: 2500,
    emoji: "🧅",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Cebolla+cabezona",
  },
  {
    name: "Papa pastusa",
    kcalPer100g: 87,
    proteinPer100g: 1.9,
    carbsPer100g: 20.1,
    fatPer100g: 0.1,
    fiberPer100g: 1.8,
    sodiumMgPer100g: 5,
    defaultPricePerKg: 2500,
    emoji: "🥔",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Papa+pastusa",
  },
  {
    name: "Plátano verde",
    kcalPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 2200,
    emoji: "🍌",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Pl%C3%A1tano+verde",
  },
  {
    name: "Batata / Camote",
    kcalPer100g: 90,
    proteinPer100g: 2.0,
    carbsPer100g: 20.7,
    fatPer100g: 0.1,
    fiberPer100g: 3.3,
    sodiumMgPer100g: 36,
    defaultPricePerKg: 3500,
    emoji: "🍠",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Camote",
  },

  // Carnes y pescados
  {
    name: "Pechuga de pollo",
    kcalPer100g: 165,
    proteinPer100g: 31.0,
    carbsPer100g: 0.0,
    fatPer100g: 3.6,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 74,
    defaultPricePerKg: 8500,
    emoji: "🍗",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Pechuga+de+pollo",
  },
  {
    name: "Carne molida",
    kcalPer100g: 254,
    proteinPer100g: 17.2,
    carbsPer100g: 0.0,
    fatPer100g: 20.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 72,
    defaultPricePerKg: 15000,
    emoji: "🥩",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Carne+molida",
  },
  {
    name: "Atún en lata",
    kcalPer100g: 116,
    proteinPer100g: 25.5,
    carbsPer100g: 0.0,
    fatPer100g: 1.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 320,
    defaultPricePerKg: 12000,
    emoji: "🐟",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=At%C3%BAn+en+lata",
  },
  {
    name: "Salmón",
    kcalPer100g: 208,
    proteinPer100g: 20.4,
    carbsPer100g: 0.0,
    fatPer100g: 13.4,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 59,
    defaultPricePerKg: 35000,
    emoji: "🐟",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Salm%C3%B3n",
  },

  // Lácteos
  {
    name: "Queso blanco",
    kcalPer100g: 254,
    proteinPer100g: 24.3,
    carbsPer100g: 2.8,
    fatPer100g: 15.9,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 627,
    defaultPricePerKg: 18000,
    emoji: "🧀",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Queso+blanco",
  },
  {
    name: "Yogur griego",
    kcalPer100g: 59,
    proteinPer100g: 10.2,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 36,
    defaultPricePerKg: 12000,
    emoji: "🥛",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Yogur+griego",
  },

  // Grasas
  {
    name: "Aceite de oliva",
    kcalPer100g: 884,
    proteinPer100g: 0.0,
    carbsPer100g: 0.0,
    fatPer100g: 100.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 2,
    defaultPricePerKg: 28000,
    emoji: "🫒",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Aceite+de+oliva",
  },
  {
    name: "Mantequilla de maní",
    kcalPer100g: 588,
    proteinPer100g: 25.0,
    carbsPer100g: 20.0,
    fatPer100g: 50.0,
    fiberPer100g: 6.0,
    sodiumMgPer100g: 17,
    defaultPricePerKg: 18000,
    emoji: "🥜",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Mantequilla+de+man%C3%AD",
  },

  // Frutas
  {
    name: "Fresa",
    kcalPer100g: 32,
    proteinPer100g: 0.7,
    carbsPer100g: 7.7,
    fatPer100g: 0.3,
    fiberPer100g: 2.0,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 8000,
    emoji: "🍓",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Fresa",
  },
  {
    name: "Piña",
    kcalPer100g: 50,
    proteinPer100g: 0.5,
    carbsPer100g: 13.1,
    fatPer100g: 0.1,
    fiberPer100g: 1.4,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 4000,
    emoji: "🍍",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Pi%C3%B1a",
  },
]

async function addMissingIngredients() {
  console.log(`🌱 Agregando ingredientes faltantes...\n`)

  let created = 0
  let skipped = 0
  let notFound = []

  for (const ingredient of missingIngredientsData) {
    // Verificar si ya existe
    const existing = await db.ingredient.findUnique({
      where: { name: ingredient.name },
    })

    if (existing) {
      console.log(`⏭️  ${ingredient.name} ${ingredient.emoji} - ya existe`)
      skipped++
      continue
    }

    try {
      await db.ingredient.create({ data: ingredient })
      console.log(`✅ ${ingredient.name} ${ingredient.emoji} - creado`)
      created++
    } catch (error) {
      console.error(`❌ Error creando ${ingredient.name}:`, error)
      notFound.push(ingredient.name)
    }
  }

  console.log(`\n─────────────────────────────────────`)
  console.log(`✅ Creados:  ${created}`)
  console.log(`⏭️  Omitidos: ${skipped} (ya existían)`)
  console.log(`❌ Errores:  ${notFound.length}`)
  if (notFound.length > 0) {
    console.log(`   Pendientes: ${notFound.join(", ")}`)
  }
  console.log(`─────────────────────────────────────\n`)
}

async function main() {
  try {
    await addMissingIngredients()
    
    // Verificar cuántos ingredientes tenemos ahora
    const totalIngredients = await db.ingredient.count()
    console.log(`📦 Total de ingredientes en BD: ${totalIngredients}`)
    
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()