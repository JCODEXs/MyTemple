# MyTemple — State Management & Data Flow

> This document is for engineers who need to understand **how data moves** through the system — from user input to database persistence and back to the UI. It covers every state machine, every data transformation, and every boundary where data changes shape.

---

## Table of Contents

1. [State Philosophy](#1-state-philosophy)
2. [Data Shape Transformations](#2-data-shape-transformations)
3. [Server State — React Query Patterns](#3-server-state--react-query-patterns)
4. [Client State — Local Component State](#4-client-state--local-component-state)
5. [Authentication State Machine](#5-authentication-state-machine)
6. [Subscription State Machine](#6-subscription-state-machine)
7. [Daily Log Flow](#7-daily-log-flow)
8. [Energy Engine Data Flow](#8-energy-engine-data-flow)
9. [Recipe System Data Flow](#9-recipe-system-data-flow)
10. [Nutrition Plan Data Flow](#10-nutrition-plan-data-flow)
11. [Coach–Client Data Flow](#11-coachclient-data-flow)
12. [Communications Data Flow](#12-communications-data-flow)
13. [Metabolic Adaptation Loop](#13-metabolic-adaptation-loop)
14. [Critical Date Handling](#14-critical-date-handling)
15. [Cache Invalidation Map](#15-cache-invalidation-map)
16. [tRPC Type Flow](#16-trpc-type-flow)

---

## 1. State Philosophy

MyTemple uses **three distinct state categories**, each with different ownership and lifecycle:

```
┌─────────────────────────────────────────────────────────────┐
│  SERVER STATE  (React Query / tRPC)                         │
│  Source of truth lives in PostgreSQL.                       │
│  UI is a projection of the server state.                    │
│  Mutations invalidate → refetch → re-render.                │
│                                                             │
│  Examples: todayLog, profile, recipes, weekLogs             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  LOCAL UI STATE  (useState / useReducer)                    │
│  Ephemeral. Lives in the component. Lost on unmount.        │
│  Never synced to server unless user submits.                │
│                                                             │
│  Examples: form values, modal open/close, selected tab      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DERIVED STATE  (useMemo)                                   │
│  Computed from server or local state. Never stored.         │
│  Recalculated when dependencies change.                     │
│                                                             │
│  Examples: macroTargets, weightSeries, weeklyTotals         │
└─────────────────────────────────────────────────────────────┘
```

### The Golden Rule

**Derived nutritional values are never stored in the database.** `Recipe` has no `kcal` column. Every nutritional value shown in the UI is computed at read time from raw ingredient data. This means:

- A correction to an ingredient's `kcalPer100g` immediately updates all recipes using it
- No migration needed when nutritional data changes
- The domain calculator is the single source of nutritional truth

---

## 2. Data Shape Transformations

Data changes shape as it moves through layers. Understanding these boundaries prevents bugs.

### Ingredient shape across layers

```
DB (Prisma)                    Domain (Calculator)              UI
─────────────────              ──────────────────               ──────────────────
Ingredient {                   RecipeIngredientInput {          DisplayIngredient {
  id: string                     ingredient: {                    id: string
  name: string                     id: string                     name: string
  kcalPer100g: Float               name: string                   emoji: string | null
  proteinPer100g: Float            kcalPer100g: number            kcalPer100g: number
  carbsPer100g: Float              proteinPer100g: number         effectivePrice: number | null
  fatPer100g: Float                carbsPer100g: number           isActive: boolean
  fiberPer100g: Float?             fatPer100g: number             hasOverride: boolean
  defaultPricePerKg: Float?        fiberPer100g: number | null    customPricePerKg: number | null
  emoji: String?               }                               }
  imageUrl: String?              gramsInBase: number
  ...                          }
}
```

The transformation from DB → Domain happens in `buildDomainIngredients()` inside `recipe.service.ts`. The transformation from DB+Override → UI happens in `ingredient.service.ts#getCatalogForUser()`.

### DailyLog shape across layers

```
Input (Form)                   Engine Output                    DB (Prisma)
────────────                   ─────────────                    ───────────
LogDayInput {                  EnergyOutput {                   DailyLog {
  date: Date                     bmr: number                      id: string
  caloriesIn: number             neat: number                     userId: string
  proteinG: number               tef: number                      date: Date (@db.Date)
  carbsG: number                 trainingKcal: number             caloriesIn: Float
  fatG: number                   totalOut: number                 proteinGrams: Float
  workout?: {                    balance: number                  carbsGrams: Float
    type: WorkoutType            estimatedWeightDeltaKg: number   fatGrams: Float
    durationMinutes: number      hydrationTargetMl: number        caloriesOut: Float
    intensityFactor: number    }                                  balance: Float
    realKcal?: number                                             estimatedWeightDeltaKg: Float
  }                                                            }
}
```

`caloriesOut` in the DB = `EnergyOutput.totalOut`. The individual components (bmr, neat, tef, training) are **not stored** — they're re-derived from profile when needed for display.

---

## 3. Server State — React Query Patterns

### Query key structure (implicit via tRPC)

tRPC generates React Query keys automatically from the router path + input:

```
api.dailyLog.getDay          → key: ["dailyLog", "getDay", { date: Date }]
api.recipe.getAll            → key: ["recipe", "getAll"]
api.userProfile.getSummary   → key: ["userProfile", "getSummary"]
```

### staleTime strategy

```typescript
// NEVER refetch — ingredient catalog doesn't change between deploys
api.ingredient.getCatalog.useQuery(undefined, { staleTime: Infinity })

// 10 min — profile changes at most once per session
api.userProfile.getSummary.useQuery(undefined, { staleTime: 10 * 60_000 })

// 5 min — weekly summaries change when user logs
api.dailyLog.getWeeklySummary.useQuery({ weekStart }, { staleTime: 5 * 60_000 })

// 30 sec — today's log changes frequently
api.dailyLog.getDay.useQuery({ date: today }, { staleTime: 30_000 })

// Poll — DMs need near-real-time feel
api.communications.getConversation.useQuery(
  { otherId },
  { refetchInterval: 5000 }
)

// Never cache — admin data must always be fresh
api.admin.getUsers.useQuery(input, { staleTime: 0 })
```

### Infinite query (feed pagination)

```typescript
const { data, fetchNextPage, hasNextPage } =
  api.communications.getFeed.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: 30_000,
    }
  )

// Flatten pages for rendering
const allPosts = data?.pages.flatMap((p) => p.items) ?? []
```

The cursor is the ISO timestamp of the last post in the page. The service uses `createdAt: { lt: new Date(cursor) }` to paginate.

---

## 4. Client State — Local Component State

### DailyLogForm state machine

```typescript
type Mode = "simple" | "detailed"

type MealPlan = Record<MealSlotId, MealRecipeEntry[]>
// MealSlotId = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "SUPPLEMENT"

// Simple mode state
const [caloriesIn, setCaloriesIn]   = useState(0)     // 0–5000 kcal
const [proteinG,   setProteinG]     = useState(0)
const [carbsG,     setCarbsG]       = useState(0)
const [fatG,       setFatG]         = useState(0)

// Detailed mode state
const [mealPlan, setMealPlan]       = useState<MealPlan>({
  BREAKFAST: [], LUNCH: [], DINNER: [], SNACK: [], SUPPLEMENT: []
})

// Shared workout state
const [workout, setWorkout]         = useState<WorkoutInput | null>(null)
const [showResult, setShowResult]   = useState(false)
```

**Pre-loading from plan** (when `getPlanForDate` returns data):

```typescript
useEffect(() => {
  if (!planForToday) return
  if (Object.values(mealPlan).some(slot => slot.length > 0)) return // don't overwrite
  
  const preloaded: MealPlan = { BREAKFAST: [], LUNCH: [], DINNER: [], SNACK: [], SUPPLEMENT: [] }
  for (const meal of planForToday.meals) {
    preloaded[meal.mealType as MealSlotId] = meal.recipes.map(r => ({
      recipeId: r.recipeId, recipeName: r.recipeName,
      servings: r.servings, kcal: r.kcal, proteinG: r.proteinG,
      carbsG: r.carbsG, fatG: r.fatG,
    }))
  }
  setMealPlan(preloaded)
  setMode("detailed") // switch automatically to detailed mode
}, [planForToday])
```

### ProfilePage state

Three independent form states with useEffect sync from server data:

```typescript
// Physical form — synced from getSummary
const [physForm, setPhysForm] = useState({ age, heightCm, weightKg, ... })
useEffect(() => { if (summary) setPhysForm(summary) }, [summary])

// Account form — synced from getSummary.user
const [accountForm, setAccountForm] = useState({ name: "", email: "" })
useEffect(() => { if (summary?.user) setAccountForm(summary.user) }, [summary?.user])

// Editing flag — controls field enable/disable
const [editingAccount, setEditingAccount] = useState(false)
```

**Why separate effects?** Profile and account data change independently. If they shared one effect, a partial server update would reset unrelated fields.

---

## 5. Authentication State Machine

```
                    ┌─────────────────┐
                    │   UNAUTHENTICATED│
                    └────────┬────────┘
                             │ signIn()
               ┌─────────────┼──────────────────┐
               │             │                  │
          credentials     Google            magic link
               │             │                  │
               └─────────────┼──────────────────┘
                             ↓
                    ┌────────────────┐
                    │  AUTHENTICATED │
                    │  (session DB)  │
                    └───────┬────────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
         no profile    has profile    subscription
              │             │           PAST_DUE
              ↓             ↓              ↓
          /setup       /dashboard    blocked login
              │
              │ userProfile.create()
              ↓
         /dashboard

signIn callback checks:
  role === "COACH" && status === "PAST_DUE"  → block
  role === "COACH" && TRIAL expired          → block
  else                                        → allow
```

### Session object shape

```typescript
// After NextAuth session callback + custom adapter
Session {
  user: {
    id:    string    // DB User.id
    role:  string    // "USER" | "COACH" | "ADMIN"
    name:  string | null
    email: string | null
    image: string | null
  }
  expires: string   // ISO date
}
```

`role` requires custom adapter override — default `PrismaAdapter` does not include it.

---

## 6. Subscription State Machine

```
NEW COACH REGISTRATION
         │
         ▼
    TRIAL (30 days)
    currentPeriodEnd = now + 30d
         │
    ┌────┴──────────────────────────┐
    │                               │
    │ user pays (MP webhook)        │ trial expires (signIn check)
    ▼                               ▼
  ACTIVE                        BLOCKED LOGIN
  currentPeriodEnd = now + 30d  → redirect /auth/subscribe
         │
    ┌────┴──────────────────────────────────┐
    │                                       │
    │ payment fails                         │ user cancels
    ▼                                       ▼
 PAST_DUE                             CANCELLED
 blocks login at signIn callback      cancelAtPeriodEnd = true
         │                            still ACTIVE until period end
         │ user resubscribes               │
         ▼                                 │ period ends
       ACTIVE ←────────────────────────────┘
```

### PendingPayment lifecycle (QR / Link payments)

```
createQRPayment() / createPaymentLink()
  → PendingPayment { activated: false, expiresAt: +30min/+24h }

MP Webhook fires OR frontend polls verifyPayment()
  → if approved: activateFromReference()
      → PendingPayment { activated: true, activatedAt: now }
      → Subscription { status: ACTIVE }
      → User.role = "COACH" (if plan === COACH)

Frontend polls every 4s for QR:
  → verifyPayment.mutate({ reference })
  → { activated: true } → redirect /setup
```

---

## 7. Daily Log Flow

### Complete write path

```
User fills DailyLogForm
         │
         │ simple mode: caloriesIn, macros from sliders
         │ detailed mode: Σ(recipe.kcal × servings) per slot
         ↓
api.dailyLog.logDay.mutate(LogDayInput)
         │
         ↓ [tRPC router]
DailyEnergyService.logDay(userId, input)
         │
         ├─ db.userProfile.findUnique(userId)
         │    → get weightKg, heightCm, age, sex,
         │       activityFactor, metabolicAdjustment
         │
         ├─ EnergyEngine.compute(profile, input)
         │    → bmr = MifflinStJeor(profile) × metabolicAdjustment
         │    → neat = bmr × (activityFactor - 1)
         │    → tef = computeTEF(input.macros)
         │    → training = computeTrainingKcal(workout, profile.weightKg)
         │    → totalOut = bmr + neat + tef + training
         │    → balance = input.caloriesIn - totalOut
         │    → deltaKg = balance / 7700
         │
         ├─ db.$transaction([
         │    workout?.create() if workout provided
         │    dailyLog.upsert({ userId_date: { userId, date } })
         │      → create: all fields
         │      → update: recalculate caloriesOut, balance, deltaKg
         │    workout.update({ dailyLogId }) to link to log
         │  ])
         │
         ↓
LogDayResult { dailyLogId, energy: EnergyOutput, workoutId }
         │
         ↓ [frontend]
utils.dailyLog.getDay.invalidate()     → refetch today's log
utils.dailyLog.getWeeklySummary.invalidate()
setShowResult(true)                    → show EnergyResultCard modal
```

### Read path — Dashboard

```
Dashboard mounts
         │
         ├─ useMemo([], []) → stable: today, weekStart, weekEnd, thirtyDaysAgo
         │
         ├─ api.userProfile.getSummary { staleTime: 10min }
         │    returns: profile + user.name + user.role + coach +
         │             latestLoggedWeight + estimatedCurrentWeight
         │
         ├─ api.dailyLog.getDay { date: today, staleTime: 30s }
         │    returns: DailyLog + workouts[]
         │
         ├─ api.dailyLog.getWeeklySummary { weekStart, staleTime: 5min }
         │    returns: { days, totalEstimatedWeightDeltaKg, averages }
         │
         ├─ api.dailyLog.getRange { from: weekStart, to: weekEnd, staleTime: 5min }
         │    returns: DailyLog[] ordered by date ASC
         │
         └─ api.dailyLog.getRange { from: -30days, to: today, staleTime: 5min }
              returns: DailyLog[] for weight sparkline
         │
         ↓ useMemo derivations
         ├─ bmrEstimate = MifflinStJeor(profile) × metabolicAdjustment
         ├─ neatEstimate = todayLog.caloriesOut - bmrEstimate
         ├─ weightSeries = cumulative sum of estimatedWeightDeltaKg from base weight
         ├─ weeklyKcalIn = weekLogs.map(l => l.caloriesIn)
         ├─ weeklyBalance = weekLogs.map(l => l.balance)
         ├─ macroTargets = tdee × macroSplit percentages / kcal-per-gram
         └─ accBMR, accTraining, accIn = weekly energy breakdown
```

---

## 8. Energy Engine Data Flow

```
EnergyEngine.compute(input: ComputeInput): EnergyOutput

ComputeInput {
  profile: {
    weightKg:            number
    heightCm:            number
    age:                 number
    sex:                 "MALE" | "FEMALE"
    activityFactor:      number  // 1.2 – 1.9
    metabolicAdjustment: number  // 0.7 – 1.3
    goal:                GoalType
  }
  nutrition: {
    caloriesIn:  number
    proteinG:    number
    carbsG:      number
    fatG:        number
  }
  workout?: {
    type:            WorkoutType
    durationMinutes: number
    intensityFactor: number  // 1–20 scale
    realKcal?:       number  // overrides MET estimate if provided
  }
}

─── Step 1: BMR ─────────────────────────────────────────────
bmr = (10 × weightKg + 6.25 × heightCm − 5 × age + sexOffset)
       × metabolicAdjustment
sexOffset = +5 (MALE) | −161 (FEMALE)

─── Step 2: NEAT ────────────────────────────────────────────
neat = bmr × (activityFactor − 1)
// activityFactor 1.2 → neat = 20% of BMR
// activityFactor 1.9 → neat = 90% of BMR

─── Step 3: TEF ─────────────────────────────────────────────
tef = proteinG × 4 × 0.25
    + carbsG   × 4 × 0.07
    + fatG     × 9 × 0.02

─── Step 4: Training ────────────────────────────────────────
if workout.realKcal:
  trainingKcal = workout.realKcal
else:
  metBase = MET_TABLE[workout.type]  // e.g. SPORTS = 7.0
  metScale = intensityToMETScale(intensityFactor)  // 0.6–1.4
  trainingKcal = 0.0175 × metBase × metScale × weightKg × durationMinutes

─── Step 5: Balance ─────────────────────────────────────────
totalOut = bmr + neat + tef + trainingKcal
balance  = caloriesIn − totalOut
deltaKg  = balance / 7700

─── Step 6: Hydration ───────────────────────────────────────
hydrationMl = weightKg × 35
            + (trainingKcal > 0 ? trainingKcal × 1.0 : 0)
// ~1ml per kcal burned in training
```

---

## 9. Recipe System Data Flow

### Create recipe

```
DesignRecipe component
  │
  ├─ ActionBox shows active ingredients (api.ingredient.getActive)
  ├─ User adds ingredient → IngredientAmountModal → picks grams
  ├─ RecipeIngredientCard shows live macros (domain calc in browser)
  │    calculateIngredientNutrition(ingredient, grams) → NutritionTotals
  │
  │ user submits
  ↓
api.recipe.create.mutate({
  name, description, baseServings, category, tags[],
  ingredients: [{ ingredientId, gramsInBase }]
})
  │
  ↓ [service]
RecipeService.create(userId, input)
  ├─ validate all ingredientIds exist
  ├─ db.$transaction([
  │    recipe.create({ ...meta }),
  │    recipeIngredient.createMany([{ recipeId, ingredientId, gramsInBase }])
  │  ])
  └─ return recipe (NO nutrition — calculated at read time)
  │
  ↓ [frontend]
utils.recipe.getAll.invalidate()
router.push("/library")
```

### Read all recipes (N+1 fixed)

```
api.recipe.getAll.query()
  │
  ↓ [service — 3 queries total]
1. recipe.findMany({ where: { userId } })
   → recipes[]

2. recipeIngredient.findMany({
     where: { recipeId: { in: recipeIds } },
     include: { ingredient: true }
   })
   → allRecipeIngredients[]  // all ingredients for all recipes

3. userIngredientOverride.findMany({
     where: { userId, ingredientId: { in: uniqueIngredientIds } }
   })
   → overrides[]

  ↓ [in-memory, O(n)]
Build Map<recipeId, RecipeIngredient[]>
Build Map<ingredientId, customPricePerKg>

  ↓ [for each recipe — no queries]
nutrition = calculateRecipeNutrition(domainIngredients, baseServings)
cost      = calculateRecipeCost(domainIngredients, baseServings)

  ↓ [return]
Recipe[] with nutrition and cost computed, no extra queries
```

### Recipe nutrition shape

```typescript
RecipeNutrition {
  perServing: {
    kcal:     number
    proteinG: number
    carbsG:   number
    fatG:     number
    fiberG:   number
  }
  total: {  // perServing × baseServings
    kcal:     number
    proteinG: number
    // ...
  }
  macroPercents: {
    proteinPct: number  // % of kcal from protein
    carbsPct:   number
    fatPct:     number
  }
}
```

---

## 10. Nutrition Plan Data Flow

### Generation flow

```
PlanBuilder: user configures name, dates, duration, targetKcal
         │
         ↓ Step 1 — Generate suggestion (not persisted)
api.nutritionPlan.generateSuggestion.mutate({ startDate, durationDays, targetKcal? })
         │
         ↓ [service]
1. Load profile → calculate TDEE → apply goal modifier
   FAT_LOSS    → targetKcal = TDEE × 0.80
   MUSCLE_GAIN → targetKcal = TDEE × 1.10
   WEIGHT_LOSS → targetKcal = TDEE × 0.85
   MAINTENANCE → targetKcal = TDEE

2. Load all user recipes with ingredients (reuses N+1 fix)

3. PlanGenerator.generatePlan(recipes, targetKcal, startDate, days)
   for each day:
     for each slot (BREAKFAST 25%, LUNCH 35%, DINNER 30%, SNACK 10%):
       slotKcal = targetKcal × slotPct
       recipe = selectBestRecipeForTarget(recipes_rotated, slotKcal)
         → score = |scaleFactor - 1| (prefer scale near 1x)
         → penalize if scale < 0.3 or > 3.0
       scaled = scaleRecipeToTargetKcal(recipe, slotKcal)

4. Return PlanSuggestion { days[], coverageScore }
         │
         ↓ Step 2 — User adjusts in WeeklyGrid
         │  swap recipes, change servings, remove slots
         │
         ↓ Step 3 — User saves
api.nutritionPlan.create.mutate({ name, startDate, endDate, targetKcal, days[] })
         │
         ↓ [service — db.$transaction]
nutritionPlan.create({ ...meta })
for each day:
  planDay.create({ planId, date })
  for each meal:
    meal.create({ dayId, mealType })
    mealRecipe.createMany([{ mealId, recipeId, servings, order }])
```

### Plan → DailyLogForm integration

```
DailyLogForm mounts with today's date (useMemo stabilized)
         │
api.nutritionPlan.getPlanForDate.query({ date: today })
         │
         ↓ [service]
planDay.findFirst({
  where: {
    date: toDateOnly(date),
    plan: { userId }
  },
  include: { meals: { include: { recipes: { include: { recipe: { include: { ingredients } } } } } } }
})
  → calculate nutrition per MealRecipe (domain calc, no stored values)
  → return PlanDayForForm { date, meals[{ mealType, recipes[] }], totals }
         │
         ↓ [frontend — useEffect]
if planForToday && mealPlan is empty:
  preloaded = { BREAKFAST: [...], LUNCH: [...], ... }
  setMealPlan(preloaded)
  setMode("detailed")
  // User sees pre-filled form, can approve or modify
```

---

## 11. Coach–Client Data Flow

### Client linking via registration code

```
Coach generates code:
api.coach.generateInviteCode.mutate()
  → db.registrationCode.create({
      code: 8-char alphanum,
      type: "CLIENT",
      createdByCoachId: coachId,
      expiresAt: now + 7d,
      maxUses: 1
    })

Client registers with code:
api.auth.register.mutate({ name, email, password, registrationCode: "ABCD1234" })
  → RegistrationService.register()
  → validate code: type === "CLIENT" && !expired && useCount < maxUses
  → db.$transaction([
      user.create({ role: "USER", coachId: code.createdByCoachId }),
      registrationCode.update({ usedAt, usedById, useCount: +1 })
    ])
  → { requiresPayment: false }
  → frontend: signIn → redirect /setup

Existing user links via profile page:
api.coach.redeemCode.mutate({ code: "ABCD1234" })
  → validate code exists, not used, not expired
  → db.$transaction([
      user.update({ coachId: code.createdByCoachId }),
      registrationCode.update({ usedAt, usedById, useCount: +1 })
    ])
```

### Coach reads client data

```
CoachClientDashboard mounts with clientId
         │
api.coach.getClientData.query({ clientId })
         │
         ↓ [service — authorization]
client = db.user.findUnique({ where: { id: clientId } })
if client.coachId !== coachId → throw FORBIDDEN
         │
         ↓ [parallel queries]
├─ dailyLog.findUnique({ userId: clientId, date: today })
├─ dailyLog.findMany({ userId: clientId, date: { gte: weekStart } })
└─ weightLog.findMany({ userId: clientId, orderBy: date DESC, take: 30 })
         │
return { client, todayLog, weekLogs, weightLogs }
         │
         ↓ [derived in component]
├─ weeklyAvg = weekLogs reduce → avg kcal, balance, protein
├─ adherenceScore = days where kcalIn / tdee is within ±15%
├─ weightSeries = weightLogs reversed → sparkline
└─ activityDots = last 7 days, green if has log
```

---

## 12. Communications Data Flow

### Post creation with auto-metrics

```
User taps "+ Post" → selects type CHECKIN
         │
         ↓ [CreatePostModal state]
type        = "CHECKIN"
visibility  = "PRIVATE" | "PUBLIC"
content     = string
imageUrls   = string[]   (UploadThing URLs)
attachMetrics = true

api.communications.createPost.mutate({ type, visibility, content, imageUrls, attachDailyMetrics: true })
         │
         ↓ [service]
if type === "CHECKIN" && attachDailyMetrics:
  today = toDateOnly(new Date())
  [log, weight] = await Promise.all([
    db.dailyLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    db.weightLog.findFirst({ where: { userId }, orderBy: { date: "desc" } })
  ])
  metrics = {
    kcalIn:   log?.caloriesIn,
    kcalOut:  log?.caloriesOut,
    balance:  log?.balance,
    proteinG: log?.proteinGrams,
    weightKg: weight?.weightKg
  }

db.post.create({ ...input, ...metrics })
         │
         ↓ [invalidate]
utils.communications.getFeed.invalidate()
```

### Feed visibility algorithm

```
getFeed(userId):
  user = db.user.findUnique(userId) → { coachId, role }

  coachClients = coachId
    ? db.user.findMany({ where: { coachId: user.coachId } })
    : []

  visibleUserIds = [
    userId,                          // own posts
    user.coachId,                    // coach's posts
    ...coachClients.map(c => c.id)   // fellow clients
  ]

  posts = db.post.findMany({
    where: {
      OR: [
        { userId: { in: visibleUserIds } },  // any visibility from group
        { visibility: "PUBLIC" }             // public from anyone
      ],
      ...(cursor ? { createdAt: { lt: cursor } } : {})
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,     // fetch one extra to determine hasNextPage
    include: POST_INCLUDE
  })

  hasMore     = posts.length > limit
  nextCursor  = hasMore ? posts[limit - 1].createdAt.toISOString() : null

  return { items: posts.slice(0, limit), nextCursor, hasMore }
```

---

## 13. Metabolic Adaptation Loop

This is the most important feedback loop in the system. It makes predictions progressively more accurate.

```
Week 1                          Week 2
─────                           ──────
profile.weightKg = 80kg         user logs real weight: 79.2kg
metabolicAdjustment = 1.0       engine predicted: 79.5kg
                                error = real - estimated = -0.3kg

estimatedWeight after week 1:
  = base + Σ(estimatedWeightDeltaKg)
  = 80 + (−0.5) = 79.5kg        ← from daily energy logs

Adaptation:
  newFactor = currentFactor × (1 + α × (realWeight − estimatedWeight))
  newFactor = 1.0 × (1 + 0.1 × (79.2 − 79.5))
  newFactor = 1.0 × (1 + 0.1 × (−0.3))
  newFactor = 1.0 × (1 − 0.03)
  newFactor = 0.97

  → metabolicAdjustment = 0.97  (metabolism is slower than predicted)
  → future BMR = BMR_mifflin × 0.97
  → future totalOut is lower → balance predictions improve
```

### Write path for weight registration

```
WeightLogForm: user enters 79.2kg
         │
api.dailyLog.logWeight.mutate({ weightKg: 79.2, date: today })
         │
         ↓ [service]
DailyEnergyService.applyMetabolicAdaptation(userId, 79.2, date)
  │
  ├─ userProfile.findUnique(userId) → { weightKg: baseWeight, metabolicAdjustment }
  ├─ dailyLog.aggregate({ _sum: { estimatedWeightDeltaKg } }) → totalDelta
  │
  ├─ estimatedCurrentWeight = baseWeight + totalDelta
  ├─ newFactor = currentFactor × (1 + 0.1 × (real − estimated))
  ├─ newFactor = clamp(newFactor, 0.7, 1.3)  // prevent runaway
  │
  └─ db.$transaction([
       userProfile.update({ metabolicAdjustment: newFactor }),
       weightLog.upsert({
         where: { userId_date: { userId, date: toDateOnly(date) } },
         create: { userId, date, weightKg: 79.2 },
         update: { weightKg: 79.2 }
       })
     ])
```

---

## 14. Critical Date Handling

### The `@db.Date` problem

PostgreSQL `DATE` type stores only the date without time. JavaScript `Date` always has a time component. This mismatch causes `findUnique` to return `null` when querying with a non-midnight timestamp.

```typescript
// This FAILS — has time component
await db.dailyLog.findUnique({
  where: { userId_date: { userId, date: new Date() } }
  //                                    ↑ e.g. 2026-03-22T18:32:50.658Z → no match
})

// This WORKS — midnight local time
function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  //             e.g. 2026-03-22T00:00:00.000 local → matches DATE column
}
await db.dailyLog.findUnique({
  where: { userId_date: { userId, date: toDateOnly(new Date()) } }
})
```

### The React Query infinite refetch problem

```typescript
// This causes infinite refetch — new Date() !== new Date()
const { data } = api.dailyLog.getDay.useQuery({
  date: new Date()  // new object every render → React Query sees "new input"
})

// This is stable — same object reference across renders
const today = useMemo(() => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}, [])  // ← computed ONCE when component mounts

const { data } = api.dailyLog.getDay.useQuery({ date: today })
```

**Rule:** Any component that passes a `Date` to a query must stabilize it with `useMemo([])`.

**Components where this applies:**
- `Dashboard.tsx` — `today`, `weekStart`, `weekEnd`, `thirtyDaysAgo`
- `DailyLogForm.tsx` — `today` for `getPlanForDate`
- `WeightLogForm.tsx` — `today` for weight logging
- `CoachClientDashboard.tsx` — `today` for `getDay`

---

## 15. Cache Invalidation Map

When a mutation succeeds, it must invalidate the queries that depend on that data.

```
Mutation                          Invalidate
────────                          ──────────
dailyLog.logDay                   dailyLog.getDay
                                  dailyLog.getWeeklySummary
                                  dailyLog.getRange (week + 30d)

dailyLog.logWeight                userProfile.getSummary
                                  dailyLog.getRange (for weight sparkline)

userProfile.update                userProfile.getSummary
                                  userProfile.get

recipe.create                     recipe.getAll
recipe.update                     recipe.getAll
                                  recipe.getOne (specific)
recipe.delete                     recipe.getAll

ingredient.toggleActive           ingredient.getCatalog
ingredient.setCustomPrice         ingredient.getCatalog
ingredient.resetOverride          ingredient.getCatalog

nutritionPlan.create              nutritionPlan.getAll
                                  nutritionPlan.getPlanForDate
nutritionPlan.delete              nutritionPlan.getAll

coach.generateInviteCode          coach.getActiveCodes
coach.unlinkClient                coach.getClients
coach.redeemCode                  userProfile.getSummary (coachId changed)

communications.createPost         communications.getFeed
communications.toggleReaction     communications.getFeed
communications.addComment         communications.getFeed
communications.sendMessage        communications.getConversation
                                  communications.getConversationList
                                  communications.getUnreadCount

subscription.activate             subscription.getStatus
subscription.cancel               subscription.getStatus

admin.changeRole                  admin.getUsers
                                  admin.getStats
admin.generateCoachCode           admin.getCodes
admin.updateSubscription          admin.getSubscriptions
```

---

## 16. tRPC Type Flow

End-to-end type safety without manual interface definitions:

```
prisma/schema.prisma
  │  npx prisma generate
  ↓
generated/prisma/index.d.ts          ← Prisma types
  │  imported by
  ↓
src/server/services/*.service.ts     ← service return types inferred
  │  called by
  ↓
src/server/api/routers/*.ts          ← router infers output type from service
  │  registered in
  ↓
src/server/api/root.ts               ← AppRouter type
  │  exported as
  ↓
RouterOutputs["recipe"]["getAll"]    ← UI types
  │  used in
  ↓
src/components/domain/*.tsx          ← React components (type-checked)
```

### Extracting types for components

```typescript
import type { RouterOutputs } from "@/trpc/react"

// Exact type of a single recipe from getAll
type Recipe = RouterOutputs["recipe"]["getAll"][number]

// Type of today's log
type TodayLog = RouterOutputs["dailyLog"]["getDay"]

// Type of a conversation list item
type Convo = RouterOutputs["communications"]["getConversationList"][number]
```

A schema change in `prisma/schema.prisma` + `npx prisma generate` propagates type errors through the entire chain without any manual interface updates.
