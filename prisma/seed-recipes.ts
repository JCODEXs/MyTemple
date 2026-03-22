// prisma/seed-recipes.ts
// Ejecutar después del seed de ingredientes:
// npx tsx prisma/seed-recipes.ts

import { PrismaClient } from "../generated/prisma"

const db = new PrismaClient()

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getIngredient(name: string) {
  const ing = await db.ingredient.findFirst({ where: { name } })
  if (!ing) {
    console.warn(`⚠️  Ingrediente no encontrado: "${name}" — omitiendo`)
    return null
  }
  return ing
}

type IngMap = Record<string, { id: string } | null>

async function loadIngredients(names: string[]): Promise<IngMap> {
  const results = await Promise.all(names.map(async (name) => [name, await getIngredient(name)]))
  return Object.fromEntries(results) as IngMap
}

async function createRecipe(data: {
  name:         string
  description:  string
  steps:        string
  baseServings: number
  category:     string
  emoji:        string
  isHealthy?:   boolean
  isVegan?:     boolean
  isVegetarian?: boolean
  isLowCarb?:   boolean
  isQuickMeal?: boolean
  isHighProtein?: boolean
  ingredients: { name: string; grams: number }[]
  seedUserId:   string
}) {
  // Buscar ingredientes
  const names = data.ingredients.map((i) => i.name)
  const ingMap = await loadIngredients(names)

  const validIngredients = data.ingredients.filter((i) => ingMap[i.name] !== null)

  if (validIngredients.length === 0) {
    console.warn(`⚠️  Receta "${data.name}" sin ingredientes válidos — omitiendo`)
    return null
  }

  const recipe = await db.recipe.create({
    data: {
      userId:      data.seedUserId,
      name:        data.name,
      description: data.description,
      steps:       data.steps,
      baseServings: data.baseServings,
      category:    data.category,
      isHealthy:   data.isHealthy   ?? false,
      isVegan:     data.isVegan     ?? false,
      isVegetarian: data.isVegetarian ?? false,
      isLowCarb:   data.isLowCarb   ?? false,
      isQuickMeal: data.isQuickMeal ?? false,
      isPrivate:   false,
      ingredients: {
        create: validIngredients.map((i) => ({
          ingredientId: ingMap[i.name]!.id,
          gramsInBase:  i.grams,
        })),
      },
    },
  })

  console.log(`✅ ${data.emoji} ${data.name}`)
  return recipe
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function main() {
  // Buscar el primer ADMIN o COACH para asignar las recetas del seed
  const seedUser =
    (await db.user.findFirst({ where: { role: "ADMIN" } })) ??
    (await db.user.findFirst({ where: { role: "COACH" } })) ??
    (await db.user.findFirst())

  if (!seedUser) {
    throw new Error("No hay usuarios en la DB. Registra un usuario primero.")
  }

  const userId = seedUser.id
  console.log(`\n🌱 Usando usuario: ${seedUser.email} (${seedUser.role})`)
  console.log("─".repeat(60))

  // ── DESAYUNOS COLOMBIANOS ──────────────────────────────────────────────────

  console.log("\n🌅 DESAYUNOS COLOMBIANOS\n")

  await createRecipe({
    seedUserId: userId,
    name:        "Calentao bogotano",
    emoji:       "🍳",
    description: "El desayuno icónico de Bogotá: sobras del día anterior reconfortadas en la sartén. Rico en carbos y proteína.",
    category:    "DESAYUNO",
    baseServings: 1,
    isQuickMeal: true,
    steps: `1. Calienta aceite en sartén a fuego medio.
2. Agrega el arroz y los frijoles, revuelve 3 min.
3. Empuja todo a un lado y cocina el huevo al gusto.
4. Sirve con plátano maduro frito y arepa al lado.`,
    ingredients: [
      { name: "Arroz blanco",           grams: 150 },
      { name: "Frijoles cocidos",        grams: 100 },
      { name: "Huevo entero",            grams: 100 },
      { name: "Plátano maduro",          grams: 80  },
      { name: "Aceite de oliva",         grams: 5   },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Huevos pericos con arepa y aguacate",
    emoji:       "🥑",
    description: "Desayuno alto en proteína y grasas saludables. Clásico colombiano adaptado al fitness.",
    category:    "DESAYUNO",
    baseServings: 1,
    isHealthy:   true,
    isLowCarb:   true,
    isQuickMeal: true,
    steps: `1. Sofríe tomate y cebolla picados 2 min en aceite.
2. Bate los huevos con sal y pimienta, añade al sofrito.
3. Revuelve a fuego bajo hasta cuajar suave.
4. Sirve con arepa caliente y aguacate en rodajas.`,
    ingredients: [
      { name: "Huevo entero",            grams: 150 }, // 3 huevos
      { name: "Tomate",                  grams: 60  },
      { name: "Cebolla cabezona",        grams: 30  },
      { name: "Aguacate",                grams: 80  },
      { name: "Aceite de oliva",         grams: 5   },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Avena con banano y canela",
    emoji:       "🌾",
    description: "Desayuno energético y saciante. Base ideal pre-entrenamiento de mañana.",
    category:    "DESAYUNO",
    baseServings: 1,
    isHealthy:    true,
    isVegetarian: true,
    isQuickMeal:  true,
    steps: `1. Cocina la avena en leche a fuego medio, revolviendo, 5 min.
2. Agrega canela y endulza al gusto (panela rallada funciona bien).
3. Sirve en bowl con banano en rodajas encima.
4. Opcional: añade una cucharada de mantequilla de maní.`,
    ingredients: [
      { name: "Avena en hojuelas",       grams: 80  },
      { name: "Leche entera",            grams: 250 },
      { name: "Banano",                  grams: 100 },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Omelette proteico de jamón y queso",
    emoji:       "🍳",
    description: "Desayuno alto en proteína, listo en 8 minutos. Perfecto para ganar músculo.",
    category:    "DESAYUNO",
    baseServings: 1,
    isHealthy:   true,
    isLowCarb:   true,
    isQuickMeal: true,
    steps: `1. Bate los huevos con sal, pimienta y una cucharada de agua.
2. Calienta sartén antiadherente con aceite a fuego medio-alto.
3. Vierte los huevos y deja cuajar los bordes 1 min.
4. Agrega jamón y queso en un lado, dobla el omelette.
5. Cocina 1 min más y sirve.`,
    ingredients: [
      { name: "Huevo entero",            grams: 180 }, // 3 huevos
      { name: "Pechuga de pollo",        grams: 60  }, // usar jamón de pavo si disponible
      { name: "Queso blanco",            grams: 40  },
      { name: "Espinaca",                grams: 30  },
      { name: "Aceite de oliva",         grams: 5   },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Tostadas integrales con huevo y aguacate",
    emoji:       "🥑",
    description: "Desayuno equilibrado estilo fit. Alto en fibra, proteína y grasas buenas.",
    category:    "DESAYUNO",
    baseServings: 1,
    isHealthy:   true,
    isVegetarian: true,
    isQuickMeal: true,
    steps: `1. Tuesta el pan integral.
2. Cocina los huevos al gusto (estrellados o revueltos).
3. Aplasta el aguacate con sal, limón y pimienta negra.
4. Unta el aguacate en las tostadas y sirve con los huevos encima.`,
    ingredients: [
      { name: "Pan integral",            grams: 80  }, // 2 rebanadas
      { name: "Huevo entero",            grams: 100 }, // 2 huevos
      { name: "Aguacate",                grams: 80  },
      { name: "Aceite de oliva",         grams: 5   },
    ],
  })

  // ── ALMUERZOS COLOMBIANOS ──────────────────────────────────────────────────

  console.log("\n☀️  ALMUERZOS COLOMBIANOS\n")

  await createRecipe({
    seedUserId: userId,
    name:        "Arroz con pollo colombiano",
    emoji:       "🍗",
    description: "El plato más popular de Colombia. Versión equilibrada con vegetales integrados.",
    category:    "ALMUERZO",
    baseServings: 2,
    isHealthy:   true,
    steps: `1. Sofríe cebolla, tomate y pimentón en aceite 5 min.
2. Agrega el pollo cortado en cubos, sella por todos lados.
3. Añade el arroz y revuelve 2 min.
4. Agrega 2 tazas de agua caliente, zanahoria y arvejas.
5. Cocina tapado a fuego bajo 20 min hasta que el arroz absorba el agua.
6. Sirve con aguacate al lado.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 300 },
      { name: "Arroz blanco",            grams: 200 },
      { name: "Zanahoria",               grams: 80  },
      { name: "Tomate",                  grams: 80  },
      { name: "Cebolla cabezona",        grams: 60  },
      { name: "Aceite de oliva",         grams: 10  },
      { name: "Aguacate",                grams: 100 },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Sopa de lentejas con plátano",
    emoji:       "🍲",
    description: "Sopa reconfortante, alta en proteína vegetal y fibra. Económica y muy nutritiva.",
    category:    "ALMUERZO",
    baseServings: 2,
    isHealthy:    true,
    isVegetarian: true,
    steps: `1. Sofríe cebolla, tomate y ajo en aceite 5 min.
2. Agrega las lentejas lavadas y cubre con 1L de agua.
3. Cocina a fuego medio 25 min.
4. Agrega el plátano verde en rodajas y la zanahoria.
5. Cocina 15 min más. Sazona con sal, comino y cilantro.`,
    ingredients: [
      { name: "Lentejas",                grams: 180 },
      { name: "Plátano verde",           grams: 150 },
      { name: "Zanahoria",               grams: 80  },
      { name: "Tomate",                  grams: 80  },
      { name: "Cebolla cabezona",        grams: 60  },
      { name: "Aceite de oliva",         grams: 10  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Frijoles rojos con arroz y carne",
    emoji:       "🫘",
    description: "El combo básico colombiano. Completo en proteína y carbohidratos complejos.",
    category:    "ALMUERZO",
    baseServings: 2,
    steps: `1. Sofríe cebolla, tomate y hogao en aceite.
2. Agrega la carne molida y cocina hasta dorar.
3. Añade los frijoles cocidos con su caldo. Sazona.
4. Sirve sobre arroz blanco con aguacate al lado.`,
    ingredients: [
      { name: "Frijoles cocidos",        grams: 200 },
      { name: "Arroz blanco",            grams: 200 },
      { name: "Carne molida",            grams: 150 },
      { name: "Tomate",                  grams: 80  },
      { name: "Cebolla cabezona",        grams: 60  },
      { name: "Aguacate",                grams: 80  },
      { name: "Aceite de oliva",         grams: 10  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Pollo a la plancha con arroz y ensalada",
    emoji:       "🥗",
    description: "El almuerzo fit por excelencia. Alto en proteína, moderado en carbos.",
    category:    "ALMUERZO",
    baseServings: 1,
    isHealthy:   true,
    isLowCarb:   false,
    steps: `1. Marina el pollo con limón, ajo y comino 20 min.
2. Cocina en sartén o plancha caliente 6-7 min por lado.
3. Sirve con arroz y ensalada de tomate, lechuga y zanahoria rallada.
4. Aliña con aceite de oliva y limón.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 200 },
      { name: "Arroz blanco",            grams: 150 },
      { name: "Tomate",                  grams: 80  },
      { name: "Zanahoria",               grams: 60  },
      { name: "Aceite de oliva",         grams: 10  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Sancocho de pollo (versión fitness)",
    emoji:       "🍵",
    description: "Sopa tradicional colombiana, adaptada para ser alta en proteína y moderada en carbos.",
    category:    "ALMUERZO",
    baseServings: 2,
    isHealthy: true,
    steps: `1. Pon el pollo en agua con cebolla larga, cilantro y ajo. Hierve.
2. A los 20 min agrega papa, yuca y plátano verde en trozos.
3. Cocina 30 min más hasta que todo esté tierno.
4. Sazona con sal, comino y sirve con arroz y aguacate al lado.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 300 },
      { name: "Papa pastusa",            grams: 150 },
      { name: "Plátano verde",           grams: 100 },
      { name: "Zanahoria",               grams: 80  },
      { name: "Cebolla cabezona",        grams: 50  },
      { name: "Aguacate",                grams: 80  },
    ],
  })

  // ── PROTEICOS / FITNESS ────────────────────────────────────────────────────

  console.log("\n💪 PLATOS PROTEICOS / FITNESS\n")

  await createRecipe({
    seedUserId: userId,
    name:        "Bowl de pollo con arroz integral y brócoli",
    emoji:       "🥦",
    description: "El meal prep por excelencia. Alto en proteína, carbos complejos y micronutrientes.",
    category:    "PROTEICO",
    baseServings: 1,
    isHealthy:   true,
    steps: `1. Cocina el pollo a la plancha con sal, pimienta y ajo en polvo.
2. Cocina el arroz integral según instrucciones (tarda ~35 min).
3. Cuece el brócoli al vapor 5 min (debe quedar al dente).
4. Arma el bowl: arroz, pollo en cubos, brócoli.
5. Aliña con aceite de oliva y limón.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 200 },
      { name: "Arroz integral",          grams: 120 },
      { name: "Brócoli",                 grams: 150 },
      { name: "Aceite de oliva",         grams: 10  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Pechuga con batata y espárragos",
    emoji:       "🍠",
    description: "Comida de definición clásica. Carbos de bajo índice glucémico + proteína magra.",
    category:    "PROTEICO",
    baseServings: 1,
    isHealthy:   true,
    isLowCarb:   false,
    steps: `1. Corta la batata en cubos y hornea 25 min a 200°C con aceite y sal.
2. Cocina el pollo a la plancha 7 min por lado.
3. Saltea los espárragos 3-4 min en sartén caliente con aceite.
4. Sirve todo junto, condimenta con limón y pimienta negra.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 200 },
      { name: "Batata / Camote",         grams: 200 },
      { name: "Brócoli",                 grams: 100 },
      { name: "Aceite de oliva",         grams: 10  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Ensalada de atún con aguacate y garbanzos",
    emoji:       "🥫",
    description: "Almuerzo alto en proteína y grasas saludables. Sin cocción, listo en 5 minutos.",
    category:    "PROTEICO",
    baseServings: 1,
    isHealthy:   true,
    isLowCarb:   true,
    isQuickMeal: true,
    steps: `1. Escurre bien el atún.
2. Mezcla atún, garbanzos, aguacate en cubos y tomate.
3. Agrega espinaca fresca al fondo del bowl.
4. Aliña con aceite de oliva, limón, sal y pimienta.`,
    ingredients: [
      { name: "Atún en lata",            grams: 160 },
      { name: "Garbanzos cocidos",       grams: 100 },
      { name: "Aguacate",                grams: 80  },
      { name: "Tomate",                  grams: 80  },
      { name: "Espinaca",                grams: 60  },
      { name: "Aceite de oliva",         grams: 10  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Wrap de pollo integral",
    emoji:       "🌯",
    description: "Almuerzo portátil y equilibrado. Ideal para llevar al trabajo o al gym.",
    category:    "PROTEICO",
    baseServings: 1,
    isHealthy:   true,
    isQuickMeal: true,
    steps: `1. Cocina el pollo a la plancha y córtalo en tiras.
2. Calienta la tortilla de harina integral en sartén seco.
3. Unta un poco de yogur griego mezclado con limón y ajo.
4. Agrega pollo, tomate, lechuga y aguacate.
5. Enrolla apretando bien.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 150 },
      { name: "Pan integral",            grams: 60  }, // usar como tortilla
      { name: "Aguacate",                grams: 50  },
      { name: "Tomate",                  grams: 60  },
      { name: "Yogur griego",            grams: 40  },
      { name: "Aceite de oliva",         grams: 5   },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Salmón con papa y espinaca salteada",
    emoji:       "🐟",
    description: "Alto en omega-3 y proteína de alta calidad. Excelente para recuperación muscular.",
    category:    "PROTEICO",
    baseServings: 1,
    isHealthy:   true,
    steps: `1. Sazona el salmón con sal, pimienta, limón y eneldo.
2. Cocina el salmón en sartén con aceite 4 min por lado.
3. Cocina la papa en cubos hervida o al vapor 15 min.
4. Saltea la espinaca con ajo en aceite de oliva 2 min.
5. Sirve todo junto con limón al lado.`,
    ingredients: [
      { name: "Salmón",                  grams: 180 },
      { name: "Papa pastusa",            grams: 150 },
      { name: "Espinaca",                grams: 100 },
      { name: "Aceite de oliva",         grams: 10  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Bowl de atún con arroz y zanahoria",
    emoji:       "🥣",
    description: "Meal prep económico y proteico. Un lata de atún puede ser la base de muchas comidas.",
    category:    "PROTEICO",
    baseServings: 1,
    isHealthy:   true,
    isQuickMeal: true,
    steps: `1. Cocina el arroz normal.
2. Ralla o corta la zanahoria fina.
3. Escurre el atún y mézclalo con un poco de yogur o mayonesa light.
4. Arma el bowl: arroz, atún, zanahoria, aguacate.
5. Exprime limón encima.`,
    ingredients: [
      { name: "Atún en lata",            grams: 160 },
      { name: "Arroz blanco",            grams: 150 },
      { name: "Zanahoria",               grams: 80  },
      { name: "Aguacate",                grams: 60  },
      { name: "Yogur griego",            grams: 30  },
    ],
  })

  // ── COMIDA RÁPIDA COLOMBIANA ───────────────────────────────────────────────

  console.log("\n🍔 COMIDA RÁPIDA / SOLUCIONES RÁPIDAS\n")

  await createRecipe({
    seedUserId: userId,
    name:        "Hamburguesa casera con papa al horno",
    emoji:       "🍔",
    description: "Versión casera de la hamburguesa. Más controlada en sodio y grasas que la de restaurante.",
    category:    "RAPIDO",
    baseServings: 1,
    isQuickMeal: true,
    steps: `1. Mezcla la carne molida con sal, pimienta y ajo. Forma la presa.
2. Corta papa en bastones, hornea 25 min a 200°C con aceite y sal.
3. Cocina la hamburguesa en sartén caliente 4 min por lado.
4. Arma: pan, lechuga, tomate, hamburguesa, queso, aguacate.`,
    ingredients: [
      { name: "Carne molida",            grams: 150 },
      { name: "Pan integral",            grams: 80  },
      { name: "Papa pastusa",            grams: 200 },
      { name: "Tomate",                  grams: 60  },
      { name: "Aguacate",                grams: 50  },
      { name: "Queso blanco",            grams: 30  },
      { name: "Aceite de oliva",         grams: 8   },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Sandwich de pollo con aguacate",
    emoji:       "🥪",
    description: "Sandwich proteico rápido. Excelente para cuando no hay tiempo de cocinar.",
    category:    "RAPIDO",
    baseServings: 1,
    isQuickMeal: true,
    isHealthy:   true,
    steps: `1. Cocina el pollo a la plancha o usa sobras de pollo.
2. Tosta el pan integral.
3. Aplasta el aguacate con limón y sal.
4. Arma: pan, aguacate, pollo, tomate en rodajas.
5. Cierra y consume inmediatamente.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 120 },
      { name: "Pan integral",            grams: 80  },
      { name: "Aguacate",                grams: 60  },
      { name: "Tomate",                  grams: 60  },
      { name: "Aceite de oliva",         grams: 5   },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Pasta con atún y tomate",
    emoji:       "🍝",
    description: "El rescue meal clásico. Rápido, económico y suficientemente proteico.",
    category:    "RAPIDO",
    baseServings: 1,
    isQuickMeal: true,
    steps: `1. Hierve la pasta según instrucciones (8-10 min).
2. Sofríe ajo y tomate picado en aceite 5 min.
3. Agrega el atún escurrido, revuelve.
4. Mezcla con la pasta escurrida, agrega aceite de oliva.
5. Espolvorea queso rallado al gusto.`,
    ingredients: [
      { name: "Pasta integral",          grams: 100 },
      { name: "Atún en lata",            grams: 120 },
      { name: "Tomate",                  grams: 100 },
      { name: "Aceite de oliva",         grams: 10  },
      { name: "Queso blanco",            grams: 20  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Arroz con huevo frito (el clásico de emergencia)",
    emoji:       "🍳",
    description: "La solución cuando no hay nada más. Sorprendentemente nutritivo si se hace bien.",
    category:    "RAPIDO",
    baseServings: 1,
    isQuickMeal: true,
    steps: `1. Calienta arroz del día anterior en sartén con poquito aceite.
2. Fríe los huevos al lado en la misma sartén.
3. Sirve el arroz con los huevos encima.
4. Acompaña con aguacate y tomate en rodajas.`,
    ingredients: [
      { name: "Arroz blanco",            grams: 200 },
      { name: "Huevo entero",            grams: 100 },
      { name: "Aguacate",                grams: 60  },
      { name: "Tomate",                  grams: 60  },
      { name: "Aceite de oliva",         grams: 8   },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Arepa rellena de pollo y queso",
    emoji:       "🫓",
    description: "La arepa rellena fitness. Alta en proteína, ideal como almuerzo rápido o merienda.",
    category:    "RAPIDO",
    baseServings: 1,
    isQuickMeal: true,
    steps: `1. Prepara la arepa de maíz y cocínala en budare o sartén.
2. Desmecha el pollo cocido y mézclalo con un poco de hogao (tomate y cebolla sofrita).
3. Abre la arepa caliente por la mitad.
4. Rellena con pollo desmechado y queso blanco.
5. Sirve inmediatamente.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 120 },
      { name: "Queso blanco",            grams: 40  },
      { name: "Tomate",                  grams: 50  },
      { name: "Cebolla cabezona",        grams: 30  },
      { name: "Aceite de oliva",         grams: 5   },
    ],
  })

  // ── BATIDOS Y SUPLEMENTOS ──────────────────────────────────────────────────

  console.log("\n🥤 BATIDOS Y SUPLEMENTOS\n")

  await createRecipe({
    seedUserId: userId,
    name:        "Batido de banano con proteína",
    emoji:       "🍌",
    description: "El batido post-entrenamiento básico. Simple, efectivo y económico.",
    category:    "BATIDO",
    baseServings: 1,
    isHealthy:   true,
    isQuickMeal: true,
    steps: `1. Pela el banano y congélalo (opcional, para textura cremosa).
2. Pon todos los ingredientes en la licuadora.
3. Licúa 30-45 segundos hasta obtener consistencia suave.
4. Consume inmediatamente post-entrenamiento.`,
    ingredients: [
      { name: "Banano",                  grams: 150 },
      { name: "Leche entera",            grams: 300 },
      { name: "Avena en hojuelas",       grams: 40  },
      { name: "Yogur griego",            grams: 100 },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Batido verde de espinaca y mango",
    emoji:       "🥬",
    description: "Batido cargado de micronutrientes. La espinaca no se siente, el mango domina el sabor.",
    category:    "BATIDO",
    baseServings: 1,
    isHealthy:   true,
    isVegan:     true,
    isQuickMeal: true,
    steps: `1. Agrega la espinaca primero a la licuadora con un poco de agua.
2. Licúa la espinaca sola hasta que no queden trozos.
3. Agrega el mango en cubos y el banano.
4. Añade agua o leche hasta la consistencia deseada.
5. Licúa 30 segundos. Sirve frío.`,
    ingredients: [
      { name: "Espinaca",                grams: 80  },
      { name: "Mango",                   grams: 150 },
      { name: "Banano",                  grams: 80  },
      { name: "Leche entera",            grams: 200 },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Batido masa muscular (weight gainer casero)",
    emoji:       "💪",
    description: "Alto en calorías y proteína. Para quienes necesitan superávit calórico serio. 700+ kcal.",
    category:    "BATIDO",
    baseServings: 1,
    isHealthy:   false,
    isQuickMeal: true,
    steps: `1. Pon la leche y la avena en la licuadora.
2. Agrega el banano maduro, el yogur y la mantequilla de maní.
3. Añade miel al gusto.
4. Licúa 45 segundos.
5. Consume como complemento del desayuno o post-entreno.`,
    ingredients: [
      { name: "Leche entera",            grams: 400 },
      { name: "Banano",                  grams: 200 },
      { name: "Avena en hojuelas",       grams: 80  },
      { name: "Yogur griego",            grams: 150 },
      { name: "Mantequilla de maní",     grams: 30  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Smoothie tropical de piña y fresa",
    emoji:       "🍍",
    description: "Batido refrescante rico en vitamina C. Perfecto como merienda o post-cardio.",
    category:    "BATIDO",
    baseServings: 1,
    isHealthy:   true,
    isVegan:     true,
    isQuickMeal: true,
    steps: `1. Congela la piña y las fresas con anticipación.
2. Licúa todos los ingredientes hasta obtener consistencia suave.
3. Si está muy espeso, agrega agua gradualmente.
4. Sirve inmediatamente con hielo.`,
    ingredients: [
      { name: "Piña",                    grams: 150 },
      { name: "Fresa",                   grams: 100 },
      { name: "Banano",                  grams: 80  },
      { name: "Leche entera",            grams: 200 },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Batido de avena y mango pre-entreno",
    emoji:       "⚡",
    description: "Carga de carbos de liberación lenta + azúcares rápidos. Ideal 60 min antes de entrenar.",
    category:    "BATIDO",
    baseServings: 1,
    isHealthy:   true,
    isVegetarian: true,
    isQuickMeal: true,
    steps: `1. Remoja la avena en leche 5 min (se licúa mejor).
2. Licúa la avena con la leche hasta que no queden grumos.
3. Agrega el mango y el banano.
4. Licúa 30 segundos más.
5. Consume 45-60 min antes del entrenamiento.`,
    ingredients: [
      { name: "Avena en hojuelas",       grams: 60  },
      { name: "Mango",                   grams: 150 },
      { name: "Banano",                  grams: 100 },
      { name: "Leche entera",            grams: 300 },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Batido de recuperación con yogur y fresa",
    emoji:       "🍓",
    description: "Post-entrenamiento ligero. El yogur griego aporta proteína de caseína para recuperación.",
    category:    "BATIDO",
    baseServings: 1,
    isHealthy:   true,
    isVegetarian: true,
    isQuickMeal: true,
    steps: `1. Congela las fresas con anticipación para textura más densa.
2. Licúa todos los ingredientes juntos 30 segundos.
3. Ajusta consistencia con leche adicional si es necesario.
4. Consume dentro de los 30 min post-entreno.`,
    ingredients: [
      { name: "Yogur griego",            grams: 200 },
      { name: "Fresa",                   grams: 150 },
      { name: "Banano",                  grams: 80  },
      { name: "Leche entera",            grams: 150 },
    ],
  })

  // ── SNACKS Y MERIENDAS ─────────────────────────────────────────────────────

  console.log("\n🍎 SNACKS Y MERIENDAS\n")

  await createRecipe({
    seedUserId: userId,
    name:        "Yogur con frutas y avena",
    emoji:       "🫙",
    description: "Merienda perfecta entre comidas. Proteína del yogur + fibra de la avena + azúcar natural.",
    category:    "SNACK",
    baseServings: 1,
    isHealthy:   true,
    isVegetarian: true,
    isQuickMeal: true,
    steps: `1. Sirve el yogur griego en un bowl.
2. Agrega la avena sin cocinar encima (así mantiene el crunch).
3. Trocea las fresas y el banano.
4. Coloca las frutas sobre el yogur.
5. Opcional: hilo de miel encima.`,
    ingredients: [
      { name: "Yogur griego",            grams: 200 },
      { name: "Avena en hojuelas",       grams: 30  },
      { name: "Fresa",                   grams: 80  },
      { name: "Banano",                  grams: 60  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Huevos duros con aguacate",
    emoji:       "🥚",
    description: "Snack proteico sin carbos. Ideal para definición o entre comidas.",
    category:    "SNACK",
    baseServings: 1,
    isHealthy:   true,
    isLowCarb:   true,
    isVegetarian: true,
    isQuickMeal: true,
    steps: `1. Hierve los huevos 10 min, enfríalos en agua fría.
2. Pélalos y córtalos en mitades.
3. Aplasta el aguacate con sal y limón.
4. Unta el aguacate sobre los huevos o sírvelo al lado.`,
    ingredients: [
      { name: "Huevo entero",            grams: 120 }, // 2 huevos
      { name: "Aguacate",                grams: 80  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Arepa integral con aguacate y atún",
    emoji:       "🫓",
    description: "Merienda completa con los 3 macros. Rápida de preparar y muy saciante.",
    category:    "SNACK",
    baseServings: 1,
    isHealthy:   true,
    isQuickMeal: true,
    steps: `1. Cocina la arepa en budare o sartén sin aceite.
2. Mientras tanto, escurre el atún y mézclalo con limón.
3. Abre la arepa y unta aguacate aplastado.
4. Agrega el atún encima con tomate picado.`,
    ingredients: [
      { name: "Atún en lata",            grams: 80  },
      { name: "Aguacate",                grams: 60  },
      { name: "Tomate",                  grams: 40  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Bowl de frutas tropicales",
    emoji:       "🍉",
    description: "Snack refrescante rico en vitaminas y antioxidantes. Bajo en calorías y alto en fibra.",
    category:    "SNACK",
    baseServings: 1,
    isHealthy:   true,
    isVegan:     true,
    isLowCarb:   false,
    isQuickMeal: true,
    steps: `1. Corta todas las frutas en cubos medianos.
2. Mezcla en un bowl.
3. Exprime limón encima y agrega una pizca de sal (resalta los sabores).
4. Opcional: toque de chamoy o ají en polvo al estilo colombiano.`,
    ingredients: [
      { name: "Mango",                   grams: 100 },
      { name: "Piña",                    grams: 100 },
      { name: "Fresa",                   grams: 80  },
      { name: "Banano",                  grams: 80  },
    ],
  })

  // ── CENAS LIGERAS ──────────────────────────────────────────────────────────

  console.log("\n🌙 CENAS LIGERAS\n")

  await createRecipe({
    seedUserId: userId,
    name:        "Ensalada proteica de pollo y garbanzos",
    emoji:       "🥗",
    description: "Cena ligera perfecta para déficit calórico. Alta en proteína y fibra, baja en carbos.",
    category:    "CENA",
    baseServings: 1,
    isHealthy:   true,
    isLowCarb:   true,
    isQuickMeal: true,
    steps: `1. Cocina el pollo a la plancha y córtalo en tiras.
2. En un bowl grande, mezcla espinaca, tomate y zanahoria rallada.
3. Agrega los garbanzos escurridos.
4. Coloca el pollo encima.
5. Aliña con aceite de oliva, limón, sal y pimienta.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 150 },
      { name: "Garbanzos cocidos",       grams: 100 },
      { name: "Espinaca",                grams: 100 },
      { name: "Tomate",                  grams: 80  },
      { name: "Zanahoria",               grams: 60  },
      { name: "Aceite de oliva",         grams: 10  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Sopa de pollo con verduras (sin papa)",
    emoji:       "🍜",
    description: "Cena reconfortante y baja en calorías. Alta en proteína, perfecta para déficit nocturno.",
    category:    "CENA",
    baseServings: 2,
    isHealthy:   true,
    isLowCarb:   true,
    steps: `1. Hierve el pollo con cebolla larga y ajo 20 min.
2. Saca el pollo, deja enfriar y desméchalo.
3. Al caldo agrega zanahoria, brócoli y espinaca.
4. Regresa el pollo desmechado. Cocina 10 min más.
5. Sazona con sal, comino y cilantro fresco.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 250 },
      { name: "Zanahoria",               grams: 100 },
      { name: "Brócoli",                 grams: 100 },
      { name: "Espinaca",                grams: 60  },
      { name: "Cebolla cabezona",        grams: 50  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Tortilla de espinaca y queso",
    emoji:       "🥚",
    description: "Cena ligera vegetariana. Lista en 10 minutos, alta en proteína y calcio.",
    category:    "CENA",
    baseServings: 1,
    isVegetarian: true,
    isLowCarb:    true,
    isHealthy:    true,
    isQuickMeal:  true,
    steps: `1. Sofríe la espinaca con ajo en aceite 2 min.
2. Bate los huevos con sal y pimienta.
3. Vierte los huevos sobre la espinaca en sartén caliente.
4. Agrega el queso desmenuzado encima.
5. Dobla la tortilla cuando los bordes cuajen. Cocina 2 min más.`,
    ingredients: [
      { name: "Huevo entero",            grams: 180 },
      { name: "Espinaca",                grams: 100 },
      { name: "Queso blanco",            grams: 50  },
      { name: "Aceite de oliva",         grams: 5   },
    ],
  })

  // ── VEGETARIANO / VEGANO ───────────────────────────────────────────────────

  console.log("\n🌿 VEGETARIANO / VEGANO\n")

  await createRecipe({
    seedUserId: userId,
    name:        "Curry de lentejas con arroz",
    emoji:       "🍛",
    description: "Plato vegano alto en proteína vegetal. Económico, sabroso y muy nutritivo.",
    category:    "VEGETARIANO",
    baseServings: 2,
    isHealthy:    true,
    isVegan:      true,
    isVegetarian: true,
    steps: `1. Sofríe cebolla, ajo y tomate con curry en polvo 5 min.
2. Agrega las lentejas lavadas y cubre con agua.
3. Cocina 25-30 min a fuego medio hasta que ablanden.
4. Sazona con sal, cúrcuma y pimienta.
5. Sirve sobre arroz blanco.`,
    ingredients: [
      { name: "Lentejas",                grams: 180 },
      { name: "Arroz blanco",            grams: 150 },
      { name: "Tomate",                  grams: 100 },
      { name: "Cebolla cabezona",        grams: 60  },
      { name: "Aceite de oliva",         grams: 10  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Bowl de garbanzos asados con verduras",
    emoji:       "🫘",
    description: "Plato vegano completo con proteína de garbanzo y carbos del arroz. Muy saciante.",
    category:    "VEGETARIANO",
    baseServings: 1,
    isHealthy:    true,
    isVegan:      true,
    isVegetarian: true,
    steps: `1. Mezcla garbanzos con aceite, sal, comino y paprika.
2. Hornea 25 min a 200°C hasta que estén crujientes.
3. Cocina el arroz integral.
4. Saltea el brócoli y la zanahoria 5 min.
5. Arma el bowl con arroz, garbanzos asados y vegetales.`,
    ingredients: [
      { name: "Garbanzos cocidos",       grams: 200 },
      { name: "Arroz integral",          grams: 120 },
      { name: "Brócoli",                 grams: 100 },
      { name: "Zanahoria",               grams: 80  },
      { name: "Aceite de oliva",         grams: 10  },
    ],
  })

  // ── MEAL PREP ──────────────────────────────────────────────────────────────

  console.log("\n📦 MEAL PREP / PREPARACIÓN EN LOTE\n")

  await createRecipe({
    seedUserId: userId,
    name:        "Pollo desmechado para la semana",
    emoji:       "🫙",
    description: "Base proteica para preparar en lote el domingo. Sirve para múltiples comidas durante la semana.",
    category:    "MEAL_PREP",
    baseServings: 4,
    isHealthy:   true,
    steps: `1. Pon las pechugas en olla a presión con cebolla, ajo y sal.
2. Cocina 20 min (olla a presión) o 40 min a fuego normal.
3. Deja enfriar, desméchalo con dos tenedores.
4. Sofríe con hogao (tomate y cebolla) para más sabor.
5. Divide en porciones de 150g y refrigera hasta 5 días.`,
    ingredients: [
      { name: "Pechuga de pollo",        grams: 800 },
      { name: "Tomate",                  grams: 150 },
      { name: "Cebolla cabezona",        grams: 100 },
      { name: "Aceite de oliva",         grams: 15  },
    ],
  })

  await createRecipe({
    seedUserId: userId,
    name:        "Arroz integral batch cooking",
    emoji:       "🍚",
    description: "Cocción de arroz integral en lote. Refrigera hasta 5 días o congela en porciones.",
    category:    "MEAL_PREP",
    baseServings: 4,
    isHealthy:   true,
    isVegan:     true,
    steps: `1. Lava el arroz integral varias veces.
2. Usa proporción 1:2 (arroz:agua).
3. Lleva a ebullición, tapa y baja el fuego.
4. Cocina 35-40 min sin destapar.
5. Deja reposar 10 min, separa en porciones de 150g y refrigera.`,
    ingredients: [
      { name: "Arroz integral",          grams: 400 },
      { name: "Aceite de oliva",         grams: 5   },
    ],
  })

  // ─── Summary ─────────────────────────────────────────────────────────────────

  const recipeCount = await db.recipe.count()
  console.log("\n" + "─".repeat(60))
  console.log(`✅ Seed completado. Total recetas en DB: ${recipeCount}`)
  console.log("─".repeat(60) + "\n")
}

main()
  .catch((e) => {
    console.error("❌ Error en seed de recetas:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
