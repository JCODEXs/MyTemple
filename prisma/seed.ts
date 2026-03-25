/**
 * Seed de ingredientes base
 * Todos los valores nutricionales son por 100g
 *
 * Fuentes: USDA FoodData Central / FAO INFOODS
 *
 * Categorías:
 *   - Proteínas animales (carnes, aves, pescados, huevos, lácteos)
 *   - Proteínas vegetales (legumbres, derivados de soya)
 *   - Carbohidratos (cereales, tubérculos, frutas)
 *   - Grasas (aceites, frutos secos, semillas)
 *   - Verduras y vegetales
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface IngredientSeed {
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
}

// ─── Dataset ──────────────────────────────────────────────────────────────────

const ingredients: IngredientSeed[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // CARNES Y AVES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Pechuga de pollo sin piel",
    kcalPer100g: 165,
    proteinPer100g: 31.0,
    carbsPer100g: 0.0,
    fatPer100g: 3.6,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 74,
    defaultPricePerKg: 8500,
    emoji: "🍗",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Pechuga+de+pollo+sin+piel",
  },
  {
    name: "Muslo de pollo sin piel",
    kcalPer100g: 177,
    proteinPer100g: 25.1,
    carbsPer100g: 0.0,
    fatPer100g: 8.2,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 84,
    defaultPricePerKg: 6500,
    emoji: "🍗",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Muslo+de+pollo+sin+piel",
  },
  {
    name: "Carne molida de res 90/10",
    kcalPer100g: 176,
    proteinPer100g: 20.7,
    carbsPer100g: 0.0,
    fatPer100g: 10.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 72,
    defaultPricePerKg: 18000,
    emoji: "🥩",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Carne+molida+de+res+90%2F10",
  },
  {
    name: "Carne molida de res 80/20",
    kcalPer100g: 254,
    proteinPer100g: 17.2,
    carbsPer100g: 0.0,
    fatPer100g: 20.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 72,
    defaultPricePerKg: 15000,
    emoji: "🥩",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Carne+molida+de+res+80%2F20",
  },
  {
    name: "Lomo de res",
    kcalPer100g: 207,
    proteinPer100g: 26.4,
    carbsPer100g: 0.0,
    fatPer100g: 11.1,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 60,
    defaultPricePerKg: 28000,
    emoji: "🥩",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Lomo+de+res",
  },
  {
    name: "Lomo de cerdo",
    kcalPer100g: 242,
    proteinPer100g: 27.3,
    carbsPer100g: 0.0,
    fatPer100g: 14.2,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 62,
    defaultPricePerKg: 12000,
    emoji: "🥩",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Lomo+de+cerdo",
  },
  {
    name: "Pavo molido 93/7",
    kcalPer100g: 148,
    proteinPer100g: 19.7,
    carbsPer100g: 0.0,
    fatPer100g: 7.8,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 88,
    defaultPricePerKg: 14000,
    emoji: "🦃",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Pavo+molido+93%2F7",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PESCADOS Y MARISCOS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Atún en agua (enlatado)",
    kcalPer100g: 116,
    proteinPer100g: 25.5,
    carbsPer100g: 0.0,
    fatPer100g: 1.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 320,
    defaultPricePerKg: 12000,
    emoji: "🐟",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=At%C3%BAn+en+agua+(enlatado)",
  },
  {
    name: "Salmón atlántico",
    kcalPer100g: 208,
    proteinPer100g: 20.4,
    carbsPer100g: 0.0,
    fatPer100g: 13.4,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 59,
    defaultPricePerKg: 35000,
    emoji: "🐟",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Salm%C3%B3n+atl%C3%A1ntico",
  },
  {
    name: "Tilapia",
    kcalPer100g: 96,
    proteinPer100g: 20.1,
    carbsPer100g: 0.0,
    fatPer100g: 1.7,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 56,
    defaultPricePerKg: 9000,
    emoji: "🐟",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Tilapia",
  },
  {
    name: "Camarón cocido",
    kcalPer100g: 99,
    proteinPer100g: 23.9,
    carbsPer100g: 0.2,
    fatPer100g: 0.3,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 224,
    defaultPricePerKg: 22000,
    emoji: "🦐",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Camar%C3%B3n+cocido",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HUEVOS Y LÁCTEOS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Huevo entero",
    kcalPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 142,
    defaultPricePerKg: 7000,
    emoji: "🥚",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Huevo+entero",
  },
  {
    name: "Clara de huevo",
    kcalPer100g: 52,
    proteinPer100g: 10.9,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 166,
    defaultPricePerKg: 6000,
    emoji: "🥚",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Clara+de+huevo",
  },
  {
    name: "Leche entera",
    kcalPer100g: 61,
    proteinPer100g: 3.2,
    carbsPer100g: 4.8,
    fatPer100g: 3.3,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 44,
    defaultPricePerKg: 3200,
    emoji: "🥛",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Leche+entera",
  },
  {
    name: "Leche descremada",
    kcalPer100g: 34,
    proteinPer100g: 3.4,
    carbsPer100g: 5.0,
    fatPer100g: 0.1,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 52,
    defaultPricePerKg: 3500,
    emoji: "🥛",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Leche+descremada",
  },
  {
    name: "Yogur griego natural 0%",
    kcalPer100g: 59,
    proteinPer100g: 10.2,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 36,
    defaultPricePerKg: 12000,
    emoji: "🥛",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Yogur+griego+natural+0%25",
  },
  {
    name: "Queso cottage 2%",
    kcalPer100g: 90,
    proteinPer100g: 11.1,
    carbsPer100g: 3.4,
    fatPer100g: 2.5,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 364,
    defaultPricePerKg: 11000,
    emoji: "🧀",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Queso+cottage+2%25",
  },
  {
    name: "Queso mozzarella part-skim",
    kcalPer100g: 254,
    proteinPer100g: 24.3,
    carbsPer100g: 2.8,
    fatPer100g: 15.9,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 627,
    defaultPricePerKg: 18000,
    emoji: "🧀",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Queso+mozzarella+part-skim",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTEÍNAS VEGETALES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Lentejas cocidas",
    kcalPer100g: 116,
    proteinPer100g: 9.0,
    carbsPer100g: 20.1,
    fatPer100g: 0.4,
    fiberPer100g: 7.9,
    sodiumMgPer100g: 2,
    defaultPricePerKg: 5500,
    emoji: "🫘",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Lentejas+cocidas",
  },
  {
    name: "Frijoles negros cocidos",
    kcalPer100g: 132,
    proteinPer100g: 8.9,
    carbsPer100g: 23.7,
    fatPer100g: 0.5,
    fiberPer100g: 8.7,
    sodiumMgPer100g: 2,
    defaultPricePerKg: 4500,
    emoji: "🫘",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Frijoles+negros+cocidos",
  },
  {
    name: "Garbanzo cocido",
    kcalPer100g: 164,
    proteinPer100g: 8.9,
    carbsPer100g: 27.4,
    fatPer100g: 2.6,
    fiberPer100g: 7.6,
    sodiumMgPer100g: 7,
    defaultPricePerKg: 5000,
    emoji: "🫘",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Garbanzo+cocido",
  },
  {
    name: "Tofu firme",
    kcalPer100g: 76,
    proteinPer100g: 8.2,
    carbsPer100g: 1.9,
    fatPer100g: 4.3,
    fiberPer100g: 0.3,
    sodiumMgPer100g: 7,
    defaultPricePerKg: 9000,
    emoji: "🥟",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Tofu+firme",
  },
  {
    name: "Edamame cocido",
    kcalPer100g: 122,
    proteinPer100g: 11.9,
    carbsPer100g: 8.9,
    fatPer100g: 5.2,
    fiberPer100g: 5.2,
    sodiumMgPer100g: 4,
    defaultPricePerKg: 11000,
    emoji: "🫘",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Edamame+cocido",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CEREALES Y GRANOS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Arroz blanco cocido",
    kcalPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28.2,
    fatPer100g: 0.3,
    fiberPer100g: 0.4,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 3000,
    emoji: "🍚",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Arroz+blanco+cocido",
  },
  {
    name: "Arroz integral cocido",
    kcalPer100g: 123,
    proteinPer100g: 2.7,
    carbsPer100g: 25.6,
    fatPer100g: 1.0,
    fiberPer100g: 1.8,
    sodiumMgPer100g: 5,
    defaultPricePerKg: 4500,
    emoji: "🍚",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Arroz+integral+cocido",
  },
  {
    name: "Avena en hojuelas",
    kcalPer100g: 389,
    proteinPer100g: 16.9,
    carbsPer100g: 66.3,
    fatPer100g: 6.9,
    fiberPer100g: 10.6,
    sodiumMgPer100g: 2,
    defaultPricePerKg: 5000,
    emoji: "🥣",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Avena+en+hojuelas",
  },
  {
    name: "Quinua cocida",
    kcalPer100g: 120,
    proteinPer100g: 4.4,
    carbsPer100g: 21.3,
    fatPer100g: 1.9,
    fiberPer100g: 2.8,
    sodiumMgPer100g: 7,
    defaultPricePerKg: 12000,
    emoji: "🍚",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Quinua+cocida",
  },
  {
    name: "Pan integral",
    kcalPer100g: 247,
    proteinPer100g: 13.0,
    carbsPer100g: 41.3,
    fatPer100g: 4.2,
    fiberPer100g: 6.0,
    sodiumMgPer100g: 450,
    defaultPricePerKg: 7000,
    emoji: "🍞",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Pan+integral",
  },
  {
    name: "Pasta de trigo cocida",
    kcalPer100g: 158,
    proteinPer100g: 5.8,
    carbsPer100g: 30.9,
    fatPer100g: 0.9,
    fiberPer100g: 1.8,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 4500,
    emoji: "🍝",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Pasta+de+trigo+cocida",
  },
  {
    name: "Tortilla de maíz",
    kcalPer100g: 218,
    proteinPer100g: 5.7,
    carbsPer100g: 44.6,
    fatPer100g: 2.5,
    fiberPer100g: 6.3,
    sodiumMgPer100g: 21,
    defaultPricePerKg: 3500,
    emoji: "🫓",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Tortilla+de+ma%C3%ADz",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TUBÉRCULOS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Papa blanca cocida",
    kcalPer100g: 87,
    proteinPer100g: 1.9,
    carbsPer100g: 20.1,
    fatPer100g: 0.1,
    fiberPer100g: 1.8,
    sodiumMgPer100g: 5,
    defaultPricePerKg: 2500,
    emoji: "🥔",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Papa+blanca+cocida",
  },
  {
    name: "Camote cocido",
    kcalPer100g: 90,
    proteinPer100g: 2.0,
    carbsPer100g: 20.7,
    fatPer100g: 0.1,
    fiberPer100g: 3.3,
    sodiumMgPer100g: 36,
    defaultPricePerKg: 3500,
    emoji: "🍠",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Camote+cocido",
  },
  {
    name: "Yuca cocida",
    kcalPer100g: 191,
    proteinPer100g: 1.6,
    carbsPer100g: 45.5,
    fatPer100g: 0.4,
    fiberPer100g: 1.8,
    sodiumMgPer100g: 14,
    defaultPricePerKg: 2800,
    emoji: "🥔",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Yuca+cocida",
  },
  {
    name: "Plátano maduro",
    kcalPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 2200,
    emoji: "🍌",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Pl%C3%A1tano+maduro",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FRUTAS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Banano",
    kcalPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 2000,
    emoji: "🍌",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Banano",
  },
  {
    name: "Manzana",
    kcalPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
    fiberPer100g: 2.4,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 5000,
    emoji: "🍎",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Manzana",
  },
  {
    name: "Mango",
    kcalPer100g: 60,
    proteinPer100g: 0.8,
    carbsPer100g: 15.0,
    fatPer100g: 0.4,
    fiberPer100g: 1.6,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 4000,
    emoji: "🥭",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Mango",
  },
  {
    name: "Papaya",
    kcalPer100g: 43,
    proteinPer100g: 0.5,
    carbsPer100g: 10.8,
    fatPer100g: 0.3,
    fiberPer100g: 1.7,
    sodiumMgPer100g: 8,
    defaultPricePerKg: 3000,
    emoji: "🍈",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Papaya",
  },
  {
    name: "Fresas",
    kcalPer100g: 32,
    proteinPer100g: 0.7,
    carbsPer100g: 7.7,
    fatPer100g: 0.3,
    fiberPer100g: 2.0,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 8000,
    emoji: "🍓",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Fresas",
  },
  {
    name: "Naranja",
    kcalPer100g: 47,
    proteinPer100g: 0.9,
    carbsPer100g: 11.8,
    fatPer100g: 0.1,
    fiberPer100g: 2.4,
    sodiumMgPer100g: 0,
    defaultPricePerKg: 3500,
    emoji: "🍊",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Naranja",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VERDURAS Y VEGETALES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Brócoli",
    kcalPer100g: 34,
    proteinPer100g: 2.8,
    carbsPer100g: 6.6,
    fatPer100g: 0.4,
    fiberPer100g: 2.6,
    sodiumMgPer100g: 33,
    defaultPricePerKg: 5000,
    emoji: "🥦",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Br%C3%B3coli",
  },
  {
    name: "Espinaca",
    kcalPer100g: 23,
    proteinPer100g: 2.9,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    fiberPer100g: 2.2,
    sodiumMgPer100g: 79,
    defaultPricePerKg: 6000,
    emoji: "🥬",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Espinaca",
  },
  {
    name: "Tomate",
    kcalPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
    fiberPer100g: 1.2,
    sodiumMgPer100g: 5,
    defaultPricePerKg: 3500,
    emoji: "🍅",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Tomate",
  },
  {
    name: "Cebolla",
    kcalPer100g: 40,
    proteinPer100g: 1.1,
    carbsPer100g: 9.3,
    fatPer100g: 0.1,
    fiberPer100g: 1.7,
    sodiumMgPer100g: 4,
    defaultPricePerKg: 2500,
    emoji: "🧅",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Cebolla",
  },
  {
    name: "Ajo",
    kcalPer100g: 149,
    proteinPer100g: 6.4,
    carbsPer100g: 33.1,
    fatPer100g: 0.5,
    fiberPer100g: 2.1,
    sodiumMgPer100g: 17,
    defaultPricePerKg: 12000,
    emoji: "🧄",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Ajo",
  },
  {
    name: "Pimentón rojo",
    kcalPer100g: 31,
    proteinPer100g: 1.0,
    carbsPer100g: 6.0,
    fatPer100g: 0.3,
    fiberPer100g: 2.1,
    sodiumMgPer100g: 4,
    defaultPricePerKg: 6000,
    emoji: "🫑",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Piment%C3%B3n+rojo",
  },
  {
    name: "Zanahoria",
    kcalPer100g: 41,
    proteinPer100g: 0.9,
    carbsPer100g: 9.6,
    fatPer100g: 0.2,
    fiberPer100g: 2.8,
    sodiumMgPer100g: 69,
    defaultPricePerKg: 3000,
    emoji: "🥕",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Zanahoria",
  },
  {
    name: "Pepino",
    kcalPer100g: 15,
    proteinPer100g: 0.7,
    carbsPer100g: 3.6,
    fatPer100g: 0.1,
    fiberPer100g: 0.5,
    sodiumMgPer100g: 2,
    defaultPricePerKg: 3000,
    emoji: "🥒",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Pepino",
  },
  {
    name: "Lechuga romana",
    kcalPer100g: 17,
    proteinPer100g: 1.2,
    carbsPer100g: 3.3,
    fatPer100g: 0.3,
    fiberPer100g: 2.1,
    sodiumMgPer100g: 8,
    defaultPricePerKg: 4500,
    emoji: "🥬",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Lechuga+romana",
  },
  {
    name: "Aguacate",
    kcalPer100g: 160,
    proteinPer100g: 2.0,
    carbsPer100g: 8.5,
    fatPer100g: 14.7,
    fiberPer100g: 6.7,
    sodiumMgPer100g: 7,
    defaultPricePerKg: 8000,
    emoji: "🥑",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Aguacate",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GRASAS Y ACEITES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Aceite de oliva extra virgen",
    kcalPer100g: 884,
    proteinPer100g: 0.0,
    carbsPer100g: 0.0,
    fatPer100g: 100.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 2,
    defaultPricePerKg: 28000,
    emoji: "🫒",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Aceite+de+oliva+extra+virgen",
  },
  {
    name: "Aceite de coco",
    kcalPer100g: 862,
    proteinPer100g: 0.0,
    carbsPer100g: 0.0,
    fatPer100g: 100.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 0,
    defaultPricePerKg: 22000,
    emoji: "🥥",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Aceite+de+coco",
  },
  {
    name: "Mantequilla",
    kcalPer100g: 717,
    proteinPer100g: 0.9,
    carbsPer100g: 0.1,
    fatPer100g: 81.1,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 643,
    defaultPricePerKg: 18000,
    emoji: "🧈",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Mantequilla",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FRUTOS SECOS Y SEMILLAS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Almendras",
    kcalPer100g: 579,
    proteinPer100g: 21.2,
    carbsPer100g: 21.6,
    fatPer100g: 49.9,
    fiberPer100g: 12.5,
    sodiumMgPer100g: 1,
    defaultPricePerKg: 32000,
    emoji: "🥜",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Almendras",
  },
  {
    name: "Nueces",
    kcalPer100g: 654,
    proteinPer100g: 15.2,
    carbsPer100g: 13.7,
    fatPer100g: 65.2,
    fiberPer100g: 6.7,
    sodiumMgPer100g: 2,
    defaultPricePerKg: 35000,
    emoji: "🌰",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Nueces",
  },
  {
    name: "Maní tostado sin sal",
    kcalPer100g: 585,
    proteinPer100g: 23.7,
    carbsPer100g: 21.5,
    fatPer100g: 49.7,
    fiberPer100g: 8.0,
    sodiumMgPer100g: 6,
    defaultPricePerKg: 9000,
    emoji: "🥜",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Man%C3%AD+tostado+sin+sal",
  },
  {
    name: "Semillas de chía",
    kcalPer100g: 486,
    proteinPer100g: 16.5,
    carbsPer100g: 42.1,
    fatPer100g: 30.7,
    fiberPer100g: 34.4,
    sodiumMgPer100g: 16,
    defaultPricePerKg: 18000,
    emoji: "🌱",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Semillas+de+ch%C3%ADa",
  },
  {
    name: "Semillas de lino",
    kcalPer100g: 534,
    proteinPer100g: 18.3,
    carbsPer100g: 28.9,
    fatPer100g: 42.2,
    fiberPer100g: 27.3,
    sodiumMgPer100g: 30,
    defaultPricePerKg: 14000,
    emoji: "🌱",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Semillas+de+lino",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPLEMENTOS / FUNCIONALES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Proteína de suero (whey)",
    kcalPer100g: 400,
    proteinPer100g: 80.0,
    carbsPer100g: 8.0,
    fatPer100g: 4.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 250,
    defaultPricePerKg: 80000,
    emoji: "🥤",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Prote%C3%ADna+de+suero+(whey)",
  },
  {
    name: "Proteína vegana (guisante)",
    kcalPer100g: 380,
    proteinPer100g: 78.0,
    carbsPer100g: 6.0,
    fatPer100g: 5.0,
    fiberPer100g: 2.0,
    sodiumMgPer100g: 330,
    defaultPricePerKg: 75000,
    emoji: "🥤",
    imageUrl: "https://placehold.co/200x200/EEE/31343C?text=Prote%C3%ADna+vegana+(guisante)",
  },
]

// ─── Seed runner ──────────────────────────────────────────────────────────────

async function seed() {
  console.log(`🌱 Iniciando seed de ingredientes...`)
  console.log(`   Total a insertar: ${ingredients.length} ingredientes\n`)

  let created = 0
  let skipped = 0

  for (const ingredient of ingredients) {
    const existing = await db.ingredient.findUnique({
      where: { name: ingredient.name },
    })

    if (existing) {
      skipped++
      continue
    }

    await db.ingredient.create({ data: ingredient })
    created++
    console.log(`   ✅ ${ingredient.name} ${ingredient.emoji}`)
  }

  console.log(`\n─────────────────────────────────────`)
  console.log(`✅ Creados:  ${created}`)
  console.log(`⏭  Omitidos: ${skipped} (ya existían)`)
  console.log(`📦 Total:    ${ingredients.length}`)
  console.log(`─────────────────────────────────────\n`)
}

seed()
  .catch((e) => {
    console.error("❌ Error en seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })