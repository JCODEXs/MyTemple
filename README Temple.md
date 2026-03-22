# MyTemple — Adaptive Physiological Modeling SaaS

> A full-stack SaaS platform that models human metabolism in real time. Every meal logged, every workout recorded, and every weight entry feeds an adaptive engine that learns and adjusts to each individual user.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Architecture — The 4-Layer Rule](#4-architecture--the-4-layer-rule)
5. [Database Schema](#5-database-schema)
6. [Domain Layer — Pure Business Logic](#6-domain-layer--pure-business-logic)
7. [Services Layer](#7-services-layer)
8. [API Layer — tRPC Routers](#8-api-layer--trpc-routers)
9. [REST API — Mobile/External](#9-rest-api--mobileexternal)
10. [Authentication System](#10-authentication-system)
11. [Registration & Access Codes](#11-registration--access-codes)
12. [Subscription & Billing — MercadoPago](#12-subscription--billing--mercadopago)
13. [Frontend — Pages & Components](#13-frontend--pages--components)
14. [Navigation & Role-Based Access](#14-navigation--role-based-access)
15. [Communications System](#15-communications-system)
16. [Performance Patterns](#16-performance-patterns)
17. [Error Handling & Monitoring](#17-error-handling--monitoring)
18. [Deployment — Vercel + Supabase](#18-deployment--vercel--supabase)
19. [Environment Variables](#19-environment-variables)
20. [Development Setup](#20-development-setup)
21. [Testing](#21-testing)
22. [Key Engineering Decisions](#22-key-engineering-decisions)
23. [Known Gotchas](#23-known-gotchas)

---

## 1. Project Overview

MyTemple is not a calorie tracker. It is a **physiological modeling engine** that computes energy balance dynamically using established metabolic formulas, then adapts those formulas to each user based on real-world weight feedback.

### Core Loop

```
User logs food (macros) + workout
        ↓
Engine computes:
  E_in  = Σ(kcal from ingredients)
  E_out = BMR × activityFactor + Training_MET + TEF
  Balance = E_in − E_out
  ΔWeight = Balance / 7700 kg
        ↓
User registers real weight
        ↓
System compares real vs estimated weight
  newFactor = currentFactor × (1 + α × (realWeight − estimatedWeight))
        ↓
Future BMR calculations use updated metabolicAdjustment
```

### User Roles

| Role | Access | Created By |
|------|--------|------------|
| `USER` | Own data only | Self-register or via coach invite code |
| `COACH` | Own data + all linked clients | Admin generates early-access code |
| `ADMIN` | Everything + superadmin panel | Database promotion |

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 15.x |
| API | tRPC | v11 |
| ORM | Prisma | 5.x |
| Database | PostgreSQL (Supabase) | 15 |
| Auth | NextAuth.js | v5 (beta) |
| Styling | Tailwind CSS | 3.x |
| Language | TypeScript | 5.x |
| Testing | Vitest | latest |
| File Uploads | UploadThing | latest |
| Email | Resend | latest |
| Payments | MercadoPago | v2 API |
| Error Monitoring | Sentry | latest |
| Deployment | Vercel | latest |

### Why T3 Stack?

The project was bootstrapped with `create-t3-app`. T3 provides end-to-end type safety from database to UI through the Prisma → tRPC → React Query chain. A schema change in Prisma propagates type errors all the way to the React component without any manual interface updates.

---

## 3. Repository Structure

```
mytemple/
├── prisma/
│   ├── schema.prisma           # Single source of truth for all DB models
│   ├── seed.ts                 # 54 ingredients with nutritional data (COP prices)
│   └── migrations/             # Timestamped SQL migration files
│
├── src/
│   ├── lib/
│   │   └── domain/             # PURE domain logic — no Prisma, no framework
│   │       ├── energy/         # Metabolic engine
│   │       │   ├── types.ts
│   │       │   ├── bmr.ts
│   │       │   ├── training.ts
│   │       │   ├── tef.ts
│   │       │   ├── adaptation.ts
│   │       │   ├── hydration.ts
│   │       │   └── energy-engine.ts
│   │       └── nutrition/
│   │           ├── recipe-calculator.ts
│   │           ├── sports-calculator.ts
│   │           └── plan-generator.ts
│   │
│   ├── server/
│   │   ├── auth.ts             # NextAuth v5 configuration
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── api/
│   │   │   ├── root.ts         # tRPC router registry
│   │   │   ├── trpc.ts         # Procedure types (public, protected, coach, admin)
│   │   │   └── routers/        # One file per domain
│   │   │       ├── auth.ts
│   │   │       ├── userProfile.ts
│   │   │       ├── ingredient.ts
│   │   │       ├── dailyLog.ts
│   │   │       ├── workout.ts
│   │   │       ├── recipe.ts
│   │   │       ├── coach.ts
│   │   │       ├── nutritionPlan.ts
│   │   │       ├── communications.ts
│   │   │       ├── subscription.ts
│   │   │       └── admin.ts
│   │   └── services/           # Orchestration layer — Prisma + domain
│   │       ├── daily-energy.service.ts
│   │       ├── user-profile.service.ts
│   │       ├── ingredient.service.ts
│   │       ├── workout.service.ts
│   │       ├── recipe.service.ts
│   │       ├── nutrition-plan.service.ts
│   │       ├── coach.service.ts
│   │       ├── communications.service.ts
│   │       ├── registration.service.ts
│   │       ├── admin.service.ts
│   │       └── mp-subscription.service.ts
│   │
│   ├── app/
│   │   ├── page.tsx            # Landing page (public)
│   │   ├── layout.tsx          # Root layout with SessionProvider
│   │   ├── (auth)/             # Public auth routes
│   │   │   └── auth/
│   │   │       ├── signin/
│   │   │       ├── register/
│   │   │       ├── subscribe/
│   │   │       └── error/
│   │   ├── (onboarding)/       # Session-gated, profile NOT required
│   │   │   └── setup/
│   │   ├── (dashboard)/        # Session + profile required
│   │   │   ├── layout.tsx      # Guard: auth + profile check
│   │   │   ├── dashboard/
│   │   │   ├── log/
│   │   │   ├── weight/
│   │   │   ├── recipes/
│   │   │   ├── ingredients/
│   │   │   ├── plans/
│   │   │   ├── messages/
│   │   │   └── profile/
│   │   ├── (coach)/            # Session + COACH/ADMIN role required
│   │   │   ├── layout.tsx
│   │   │   └── coach/clients/
│   │   ├── (superadmin)/       # ADMIN role required
│   │   │   ├── layout.tsx
│   │   │   └── superadmin/
│   │   └── api/
│   │       ├── auth/[...nextauth]/   # NextAuth handler
│   │       ├── trpc/[trpc]/         # tRPC handler
│   │       ├── webhooks/mp/         # MercadoPago webhooks
│   │       └── v1/                  # REST endpoints (mobile)
│   │
│   ├── components/
│   │   ├── navigation/
│   │   │   └── AppNav.tsx      # Sidebar (desktop) + bottom tabs (mobile)
│   │   ├── auth/
│   │   │   ├── SignInPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── SubscribePage.tsx
│   │   ├── ui/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── Skeleton.tsx
│   │   └── domain/
│   │       ├── Dashboard.tsx
│   │       ├── DailyLogForm.tsx
│   │       ├── WeightLogForm.tsx
│   │       ├── OnboardingForm.tsx
│   │       ├── ProfilePage.tsx
│   │       ├── RecipeLibrary.tsx
│   │       ├── DesignRecipe.tsx
│   │       ├── PlanBuilder.tsx
│   │       ├── PlanViewer.tsx
│   │       ├── MessagesPage.tsx
│   │       ├── SuperAdminPanel.tsx
│   │       ├── SubscriptionStatus.tsx
│   │       └── coach/
│   │           ├── CoachClientsPage.tsx
│   │           └── CoachClientDashboard.tsx
│   │
│   └── __tests__/
│       └── energy-engine.test.ts   # 30 Vitest tests
│
├── .cursor/rules/
│   └── architecture.mdc        # AI coding rules — enforces layer boundaries
├── vercel.json
├── sentry.client.config.ts
├── sentry.server.config.ts
└── sentry.edge.config.ts
```

---

## 4. Architecture — The 4-Layer Rule

This is the most important architectural constraint in the project. **Never bypass it.**

```
┌─────────────────────────────────────────────────────┐
│  DOMAIN  /src/lib/domain/                           │
│  Pure TypeScript. No Prisma. No Next.js. No fetch.  │
│  Input → Output. Fully testable in isolation.       │
└──────────────────────┬──────────────────────────────┘
                       │ called by
┌──────────────────────▼──────────────────────────────┐
│  SERVICES  /src/server/services/                    │
│  Orchestrates Domain + Prisma.                      │
│  All DB writes use db.$transaction().               │
│  UserId ALWAYS comes from the session, never input. │
└──────────────────────┬──────────────────────────────┘
                       │ called by
┌──────────────────────▼──────────────────────────────┐
│  ROUTERS  /src/server/api/routers/                  │
│  Thin tRPC layer. Calls services. Validates input.  │
│  Never contains business logic.                     │
│  Never queries DB directly.                         │
└──────────────────────┬──────────────────────────────┘
                       │ parallel path
┌──────────────────────▼──────────────────────────────┐
│  REST  /src/app/api/v1/                             │
│  Mirrors tRPC for mobile/external clients.          │
│  Same services, different transport.                │
└─────────────────────────────────────────────────────┘
```

### Critical Rules

1. **Domain never imports from `@/server`** — it has no Prisma dependency
2. **Services never import from `@/server/api`** — no tRPC context in services
3. **Routers never import Prisma directly** — always go through services
4. **Never store derived nutritional values in DB** — always calculate from ingredients at read time
5. **All writes use `db.$transaction()`** — atomicity is non-negotiable
6. **`upsert` for date-keyed logs** — `DailyLog`, `WeightLog`, `HydrationLog` use `@@unique([userId, date])`

---

## 5. Database Schema

### Core Models

```prisma
User
  ├── UserProfile          (1:1) physical data + metabolic config
  ├── Subscription         (1:1) billing state
  ├── DailyLog[]           (1:N) daily energy records, keyed by date
  ├── WeightLog[]          (1:N) weight measurements
  ├── Workout[]            (1:N) training sessions
  ├── Recipe[]             (1:N) user-created recipes
  ├── NutritionPlan[]      (1:N) weekly meal plans
  ├── Post[]               (1:N) community feed posts
  ├── DirectMessage[]      (1:N) sent messages
  ├── RegistrationCode[]   (1:N) CLIENT codes generated by coach
  ├── coach/clients        (self-referential) User.coachId → User.id
  └── ingredientOverrides  (1:N) custom prices/active flags per ingredient
```

### Date Fields Pattern

Fields that map to `@db.Date` in PostgreSQL use **date-only semantics** (no time component). This is critical — passing a JavaScript `Date` with a non-zero time component will fail to match on `findUnique`.

```typescript
// Required helper — use everywhere a Date touches @db.Date fields
function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
```

Affected models: `DailyLog.date`, `WeightLog.date`, `HydrationLog.date`

### Nutritional Data Rule

**Nutritional values are NEVER stored as derived fields.** `Recipe` has no `kcal` column. `DailyLog` has no `protein` per recipe. All nutrition is calculated at read time from raw ingredient data using the domain calculator.

The only exception: `DailyLog` stores the aggregated daily totals (`caloriesIn`, `proteinGrams`, etc.) because they represent a user's actual logged day — not a derivation from stored recipes.

---

## 6. Domain Layer — Pure Business Logic

### Energy Engine (`/src/lib/domain/energy/`)

The metabolic engine has zero side effects and is fully testable.

#### BMR — `bmr.ts`
```typescript
// Mifflin-St Jeor formula × metabolic adjustment factor
BMR = (10 × weight_kg + 6.25 × height_cm − 5 × age + sex_offset) × metabolicAdjustment
// sex_offset: +5 for MALE, −161 for FEMALE
```

#### Training Energy — `training.ts`
```typescript
// MET-based calculation
kcal = 0.0175 × MET × weightKg × durationMinutes
// If user provides realKcal, that overrides the estimate
```

#### TEF — Thermic Effect of Food — `tef.ts`
```typescript
// Different macros cost different amounts of energy to digest
TEF = protein_g × 4 × 0.25    // 25% of protein kcal
    + carbs_g   × 4 × 0.07    // 7% of carb kcal
    + fat_g     × 9 × 0.02    // 2% of fat kcal
```

#### Metabolic Adaptation — `adaptation.ts`
```typescript
// Called when user registers real weight
// α (alpha) = learning rate, typically 0.1
newFactor = currentFactor × (1 + α × (realWeight − estimatedWeight))
// Clamped between 0.7 and 1.3 to prevent runaway adaptation
```

#### Full Engine Output — `energy-engine.ts`
```typescript
interface EnergyOutput {
  bmr:                    number
  neat:                   number  // BMR × activityFactor − BMR
  tef:                    number
  trainingKcal:           number
  totalOut:               number  // bmr + neat + tef + training
  balance:                number  // caloriesIn − totalOut
  estimatedWeightDeltaKg: number  // balance / 7700
  hydrationTargetMl:      number  // weightKg × 35 + training adjustment
}
```

### Recipe Calculator (`/src/lib/domain/nutrition/recipe-calculator.ts`)

```typescript
// Core types
interface RecipeIngredientInput {
  ingredient: { kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g, fiberPer100g }
  gramsInBase: number
}

// Key functions
calculateIngredientNutrition(ingredient, grams)   → NutritionTotals
calculateRecipeNutrition(ingredients, baseServings) → RecipeNutrition
scaleRecipeByServings(ingredients, base, target)  → ScaledRecipe
scaleRecipeToTargetKcal(ingredients, base, kcal)  → ScaledRecipe  // used by plan generator
calculateRecipeCost(ingredients, servings)         → { totalCost, costPerServing }
```

### Sports Calculator (`/src/lib/domain/nutrition/sports-calculator.ts`)

13 sports with scientifically-sourced MET values:

| Sport | Base MET |
|-------|----------|
| Athletics | 10.0 |
| Running | 9.8 |
| Rugby | 8.3 |
| Rowing | 8.5 |
| Cycling | 8.0 |
| Martial Arts | 7.8 |
| Football | 7.0 |
| Swimming | 7.0 |
| Tennis | 7.3 |
| Basketball | 6.5 |
| Padel | 6.0 |
| Volleyball | 4.0 |
| Construction | 5.5 |

Intensity (1–20 scale) maps to a MET multiplier via `intensityToMETScale()` → [0.6, 1.4].

### Plan Generator (`/src/lib/domain/nutrition/plan-generator.ts`)

Generates weekly meal plans by:
1. Calculating daily kcal target from TDEE × goal modifier (FAT_LOSS: ×0.80, MUSCLE_GAIN: ×1.10, etc.)
2. Distributing kcal across slots: BREAKFAST 25%, LUNCH 35%, DINNER 30%, SNACK 10%
3. Selecting best-fitting recipe per slot using `selectBestRecipeForTarget()` — prefers scale factors between 0.5× and 2.5×
4. Rotating recipes across days for variety
5. Returning a `PlanSuggestion` with `coverageScore` (0–1)

---

## 7. Services Layer

### Pattern

Every service follows this pattern:

```typescript
export const SomeService = {
  async methodName(userId: string, input: ValidatedInput) {
    // 1. Fetch necessary data from DB
    // 2. Call domain functions if needed
    // 3. Write to DB inside db.$transaction()
    // 4. Return result
  }
}
```

**`userId` always comes from the session, never from user input.** Services trust the userId they receive — authorization happens at the router level before the service is called.

### Services Reference

| Service | Responsibility |
|---------|---------------|
| `daily-energy.service.ts` | `logDay`, `getDay`, `getRange`, `getWeeklySummary`, `applyMetabolicAdaptation` |
| `user-profile.service.ts` | `create`, `update`, `getSummary` (includes `user.role`, `coach`, estimated weight) |
| `ingredient.service.ts` | Catalog with override merging, active/inactive filtering |
| `workout.service.ts` | CRUD + kcal estimation from profile weight |
| `recipe.service.ts` | **Optimized** — 3 queries total regardless of recipe count (see §16) |
| `nutrition-plan.service.ts` | Plan generation, `getPlanForDate` for DailyLogForm pre-loading |
| `coach.service.ts` | Code generation, client management, client dashboard data |
| `communications.service.ts` | Posts, reactions, comments, challenges, DMs |
| `registration.service.ts` | User registration with code validation, coach code generation |
| `admin.service.ts` | User management, role changes, subscription oversight |
| `mp-subscription.service.ts` | MercadoPago subscriptions, QR payments, webhooks |

---

## 8. API Layer — tRPC Routers

### Procedure Types

```typescript
// src/server/api/trpc.ts

publicProcedure    // No auth required (registration, code preview)
protectedProcedure // Session required (most endpoints)
coachProcedure     // Session + role COACH or ADMIN
adminProcedure     // Session + role ADMIN only
```

`coachProcedure` and `adminProcedure` are middleware-composed:
```typescript
export const coachProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "COACH" && ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" })
  }
  return next({ ctx })
})
```

### Router Registry (`src/server/api/root.ts`)

```typescript
export const appRouter = createTRPCRouter({
  auth:           authRouter,          // public + protected
  userProfile:    userProfileRouter,
  ingredient:     ingredientRouter,
  dailyLog:       dailyLogRouter,
  workout:        workoutRouter,
  recipe:         recipeRouter,
  coach:          coachRouter,         // coachProcedure
  nutritionPlan:  nutritionPlanRouter,
  communications: communicationsRouter,
  subscription:   subscriptionRouter,
  admin:          adminRouter,         // adminProcedure
})
```

### Two-Layer Authorization

Authorization is enforced at two independent layers:

1. **Router level** — `coachProcedure`/`adminProcedure` reject unauthorized roles before the service is called
2. **Service level** — Services verify ownership (e.g., `client.coachId === coachId`) regardless of the router check

This means even if the router check were bypassed (impossible in practice), the service would still reject the request.

---

## 9. REST API — Mobile/External

Located in `src/app/api/v1/`. Mirrors the tRPC API for clients that cannot use tRPC.

```
GET  /api/v1/profile
POST /api/v1/profile
PATCH /api/v1/profile

GET  /api/v1/ingredients
PATCH /api/v1/ingredients/[id]
DELETE /api/v1/ingredients/[id]/override

GET  /api/v1/daily-logs          ?date= | ?from=&to= | ?weekStart=
POST /api/v1/daily-logs

POST /api/v1/weight-logs

GET  /api/v1/workouts            ?from=&to= | ?summary=true
POST /api/v1/workouts
GET  /api/v1/workouts/[id]
PATCH /api/v1/workouts/[id]
DELETE /api/v1/workouts/[id]

GET  /api/v1/recipes
POST /api/v1/recipes
```

Every REST handler calls the same service functions as the tRPC routers. The session is obtained via `auth()` from NextAuth.

---

## 10. Authentication System

### Providers

| Provider | Type | Use Case |
|----------|------|----------|
| Credentials | Email + bcrypt password | Primary for Colombian users |
| Google OAuth | Social | Quick registration |
| Discord OAuth | Social | Community users |
| Resend | Magic link | Passwordless option |

### Session Strategy

Uses **database sessions** (not JWT). This is the T3 default with `PrismaAdapter`.

```typescript
// auth.ts — critical: role must come from the DB adapter, not the token
adapter: {
  ...PrismaAdapter(db),
  // Custom getUser/getUserByEmail to include role field
  async getUser(id) {
    return db.user.findUnique({
      where: { id },
      select: { id, email, emailVerified, name, image, role }
    })
  }
}

callbacks: {
  session: ({ session, user }) => ({
    ...session,
    user: { ...session.user, id: user.id, role: user.role ?? "USER" }
  })
}
```

### Route Groups & Guards

```
(auth)/          → No guard — public pages
(onboarding)/    → layout.tsx checks session only (profile may not exist yet)
(dashboard)/     → layout.tsx checks session + UserProfile existence
(coach)/         → layout.tsx checks session + role COACH/ADMIN
(superadmin)/    → layout.tsx checks session + role ADMIN
```

The dashboard layout redirects to `/setup` if no profile exists, and to `/auth/signin` if no session. The `/setup` route is in `(onboarding)` — **not** in `(dashboard)` — to avoid the redirect loop that occurs when the layout guard checks for a profile that doesn't exist yet.

### Subscription Guard in signIn Callback

```typescript
async signIn({ user }) {
  const dbUser = await db.user.findUnique({ ... select: { role, subscription } })

  // Block PAST_DUE subscriptions at login time
  if (dbUser?.role === "COACH" && dbUser.subscription?.status === "PAST_DUE") {
    return "/auth/signin?error=SubscriptionExpired"
  }
  return true
}
```

---

## 11. Registration & Access Codes

### Two Code Types

| Type | Created By | Effect |
|------|-----------|--------|
| `COACH` | Admin (superadmin panel or API) | Registers user with `role=COACH` + creates `Subscription(TRIAL)` |
| `CLIENT` | Coach (from ProfilePage) | Registers user with `role=USER` + sets `coachId` automatically |

### Code Flow

```
POST /api/trpc/auth.register
  → RegistrationService.register(input)
    → validate email uniqueness
    → validate code (if provided)
    → bcrypt.hash(password, 12)
    → db.$transaction([
        createUser({ role, coachId }),
        markCodeUsed(),
        if COACH: createSubscription({ status: TRIAL })
      ])
    → return { requiresPayment: boolean }

Frontend:
  → if requiresPayment → redirect /auth/subscribe
  → else → signIn() → redirect /setup
```

### Code Preview (Real-time Validation)

`api.auth.previewCode` is a `publicProcedure` query called as the user types. It returns `{ valid, type, coachName, expiresAt }` without consuming the code. The `RegisterPage` shows a colored badge in real time.

---

## 12. Subscription & Billing — MercadoPago

### Payment Methods

1. **Checkout Pro** (link) — redirects to MP, supports PSE/Nequi/Daviplata/card
2. **QR Dinámico** — generates a scannable QR, polls every 4s for confirmation
3. **Subscriptions API** — recurring monthly charge, fully automatic

### Webhook Flow

```
MercadoPago → POST /api/webhooks/mp
  → verify signature (production only)
  → parse event type:
      "payment"              → look up PendingPayment by external_reference
                             → if approved: activateFromReference()
      "preapproval"          → look up by preapproval ID
                             → if authorized: activateFromSubscriptionId()
      "subscription_preapproval" → if cancelled/paused: update DB status
  → always return 200 (prevents MP retries on handler errors)
```

### Activation

Both webhook-triggered and frontend-triggered (after redirect) call the same `_activateUser()` method:

```typescript
async _activateUser(userId, plan, ref) {
  await db.$transaction([
    db.subscription.upsert({ ... status: "ACTIVE", currentPeriodEnd: +30days }),
    db.pendingPayment.update({ ... activated: true }),
  ])

  if (plan === "COACH") {
    await db.user.update({ role: "COACH" })
  }
}
```

### Subscription States

```
TRIAL    → default after COACH registration (30 days)
ACTIVE   → payment confirmed
PAST_DUE → payment failed (blocks login for COACH)
CANCELLED → user or MP cancelled (active until currentPeriodEnd)
```

---

## 13. Frontend — Pages & Components

### Dashboard

The dashboard makes **5 tRPC calls** on mount, all with `useMemo`-stabilized dates:

```typescript
const { today, weekStart, weekEnd, thirtyDaysAgo } = useMemo(() => {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // midnight
  // ... derive other dates
}, []) // ← empty deps: computed once, never changes
```

**Why `useMemo` with `[]`?** React Query uses referential equality to detect input changes. `new Date() !== new Date()` even for the same moment, so each render would appear to have different query inputs, triggering infinite refetches. The `useMemo` with `[]` ensures the `Date` objects are created once and remain the same reference for the component's lifetime.

### DailyLogForm

Two modes:
- **Simple** — kcal + macro sliders with coherence checks
- **Detailed** — 5 meal slots (BREAKFAST, LUNCH, DINNER, SNACK, SUPPLEMENT) with `RecipePickerModal` per slot

Pre-loading from nutrition plan:
```typescript
const today = useMemo(() => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}, [])

const { data: planForToday } = api.nutritionPlan.getPlanForDate.useQuery(
  { date: today },
  { staleTime: 60_000 }
)

useEffect(() => {
  if (!planForToday || Object.keys(mealPlan).length > 0) return
  // Pre-populate mealPlan state from plan
  // Switch to detailed mode automatically
}, [planForToday])
```

### Recipe Service — N+1 Fix

The naive approach loads recipes, then for each recipe loads its ingredients separately — O(n) queries. The optimized service uses 3 fixed queries:

```typescript
async getAll(userId) {
  // Query 1: all recipes
  const recipes = await db.recipe.findMany({ where: { userId } })

  // Query 2: ALL ingredients for ALL recipes in one shot
  const allRIs = await db.recipeIngredient.findMany({
    where: { recipeId: { in: recipes.map(r => r.id) } },
    include: { ingredient: true }
  })

  // Query 3: ALL user overrides in one shot
  const overrides = await db.userIngredientOverride.findMany({
    where: { userId, ingredientId: { in: uniqueIngredientIds } }
  })

  // Build maps in memory O(n), no more queries
  const ingredientsByRecipe = new Map(...)
  const overrideMap = new Map(...)

  // Calculate nutrition in memory for each recipe
  return recipes.map(recipe => ({
    ...recipe,
    nutrition: calculateRecipeNutrition(...),
    cost: calculateRecipeCost(...)
  }))
}
```

Result: 3 queries regardless of recipe count vs. `1 + N×3` previously.

---

## 14. Navigation & Role-Based Access

### AppNav Component

`AppNav.tsx` renders differently by viewport:
- **Desktop (md+):** Fixed sidebar, 64px wide (icons only), expands to 224px on hover
- **Mobile:** Fixed bottom tab bar with 5 key routes

```typescript
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", roles: [],                       bottom: true  },
  { href: "/log",       roles: ["USER","COACH","ADMIN"], bottom: true  },
  // ...
  { href: "/coach/clients", roles: ["COACH","ADMIN"],    bottom: false },
  { href: "/superadmin",    roles: ["ADMIN"],             bottom: false },
]

// Filter items by role
function filterByRole(items, role) {
  return items.filter(item => item.roles.length === 0 || item.roles.includes(role))
}
```

`roles: []` means visible to everyone. Bottom tabs only show `bottom: true` items.

### Layout Guards

Each route group has a server-side layout that checks:

```typescript
// (dashboard)/layout.tsx
const session = await auth()
if (!session) redirect("/auth/signin")

const profile = await db.userProfile.findUnique({ where: { userId: session.user.id } })
if (!profile) redirect("/setup")

// Pass role down to AppNav
```

The `role` and `userName` are fetched **once** in the layout and passed to `AppNav` as props. Components within the dashboard read role through the session or `userProfile.getSummary` — they never fetch the user record independently.

---

## 15. Communications System

### Post Model

Posts have two dimensions:
1. **Type** — CHECKIN, ACHIEVEMENT, QUESTION, CHALLENGE, SHARE, FREE
2. **Visibility** — PRIVATE (coach+user only), COACH_GROUP (entire coach's client group), PUBLIC

CHECKIN posts auto-attach physiological metrics from the day's `DailyLog`:

```typescript
if (type === "CHECKIN" && attachDailyMetrics) {
  const [log, weight] = await Promise.all([
    db.dailyLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    db.weightLog.findFirst({ where: { userId }, orderBy: { date: "desc" } })
  ])
  // metrics = { kcalIn, kcalOut, balance, proteinG, weightKg }
}
```

### Feed Authorization

The feed service computes visibility dynamically per user:

```typescript
const visibleUserIds = [
  userId,                           // own posts
  ...(user?.coachId ? [user.coachId] : []),   // coach's posts
  ...coachClients.map(c => c.id),   // fellow clients' posts
]

// Posts are visible if:
// - authored by visibleUserIds (any visibility)
// - OR visibility === "PUBLIC" (from anyone)
```

### Direct Messages

Uses polling at 5-second intervals (no WebSockets). Suitable for MVP — upgrade path is Pusher or Supabase Realtime.

Conversation list uses a Map to deduplicate by `otherId`:
```typescript
const seen = new Set<string>()
for (const msg of messages) {
  const otherId = msg.fromId === userId ? msg.toId : msg.fromId
  if (!seen.has(otherId)) { seen.add(otherId); convos.push(msg) }
}
```

---

## 16. Performance Patterns

### React Query `staleTime` Strategy

| Data Type | `staleTime` | Rationale |
|-----------|------------|-----------|
| Ingredient catalog | `Infinity` | Never changes between app updates |
| User profile/summary | `10 * 60_000` | Changes at most daily |
| Recipe library | `10 * 60_000` | Explicit user action to change |
| Weekly summaries | `5 * 60_000` | Moderately volatile |
| Today's log | `30_000` | User may log multiple times per hour |
| DM conversations | `refetchInterval: 5000` | Polling for real-time feel |
| Admin data | `0` | Always fresh |

### Date Stabilization Pattern

Any query that accepts a `Date` as input **must** wrap it in `useMemo`:

```typescript
// ✅ Correct — Date object is stable across renders
const today = useMemo(() => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}, [])

// ❌ Wrong — new Date() creates a different object every render
const { data } = api.dailyLog.getDay.useQuery({ date: new Date() })
```

### Database Indexes

Key indexes beyond the unique constraints:

```prisma
DailyLog    @@index([userId, date])     // getRange queries
Workout     @@index([userId, date])     // date range filters
Workout     @@index([dailyLogId])       // join with DailyLog
Recipe      @@index([userId, updatedAt]) // sorted listing
RecipeIngredient @@index([recipeId])    // batch loading
PlanDay     @@index([date])             // getPlanForDate cross-plan lookup
```

### Ingredient Override Shortcut

When a user has no overrides (most common case early on), skip building the Map:

```typescript
if (overrides.length === 0) {
  return ingredients.map(ing => ({
    ...ing, effectivePrice: ing.defaultPricePerKg, isActive: true, hasOverride: false
  }))
}
// Only build Map if overrides exist
```

---

## 17. Error Handling & Monitoring

### ErrorBoundary

`ErrorBoundary` is a class component (required by React's error boundary API) that:
1. Catches errors from any child component tree
2. Reports to Sentry with `captureException` and returns the `eventId`
3. Shows a retry button + the Sentry event ID for support

Usage:
```tsx
<ErrorBoundary section="Recipe Library">
  <RecipeLibrary />
</ErrorBoundary>
```

### Sentry Configuration

Three config files required by Next.js:
- `sentry.client.config.ts` — browser errors + session replay
- `sentry.server.config.ts` — server-side errors + tracing
- `sentry.edge.config.ts` — middleware/edge runtime errors

Sample rates in production:
- `tracesSampleRate: 0.1` — 10% of transactions traced (cost control)
- `replaysSessionSampleRate: 0.05` — 5% of sessions recorded
- `replaysOnErrorSampleRate: 1.0` — 100% of error sessions recorded

### tRPC Error Pattern

Services throw `TRPCError` with appropriate codes:

| Code | Usage |
|------|-------|
| `NOT_FOUND` | Resource doesn't exist |
| `FORBIDDEN` | Exists but user can't access it |
| `CONFLICT` | Duplicate email, code already used |
| `BAD_REQUEST` | Invalid input that passed Zod |
| `PRECONDITION_FAILED` | Limit reached (early access cap) |
| `UNAUTHORIZED` | No session (handled by `protectedProcedure`) |

---

## 18. Deployment — Vercel + Supabase

### Supabase Connection Strings

Supabase requires **two** connection strings for Prisma:

```env
DATABASE_URL="postgres://...pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgres://...supabase.com:5432/postgres"
```

`DATABASE_URL` uses the **transaction pooler** (PgBouncer) — required for serverless Vercel functions that can't maintain persistent connections.

`DIRECT_URL` is the direct connection used **only for migrations** (`prisma migrate deploy`).

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Vercel Build Command

```
prisma generate && next build
```

`prisma generate` must run before the build to generate the Prisma client into `generated/prisma/`.

### `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "prisma generate && next build",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options",        "value": "DENY"    }
      ]
    }
  ]
}
```

### Rate Limiting

`middleware.ts` applies a simple in-memory rate limiter (60 req/min per IP) on `/api/v1/*`. For production with high traffic, replace with Upstash Redis + `@upstash/ratelimit`.

---

## 19. Environment Variables

```env
# Database
DATABASE_URL=""          # Supabase transaction pooler URL
DIRECT_URL=""            # Supabase direct connection URL

# NextAuth
NEXTAUTH_URL=""          # Full domain: https://mytemple.app
NEXTAUTH_SECRET=""       # openssl rand -base64 32

# OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""

# Email (Resend)
RESEND_API_KEY=""
RESEND_FROM="noreply@mytemple.app"

# File Uploads (UploadThing)
UPLOADTHING_TOKEN=""

# MercadoPago
MP_ACCESS_TOKEN=""              # TEST-XXX for sandbox, APP_USR-XXX for production
NEXT_PUBLIC_MP_PUBLIC_KEY=""
MP_PLAN_ID_ATHLETE=""           # Plan ID from MP API
MP_PLAN_ID_COACH=""
MP_WEBHOOK_SECRET=""            # Arbitrary string for webhook signature
MP_BASE_URL="https://api.mercadopago.com"
MP_STORE_ID=""                  # Optional: for QR in-store payments
MP_POS_ID=""                    # Optional: for QR in-store payments
MP_USER_ID=""                   # Numeric MP user ID

# App config
COACH_EARLY_ACCESS_LIMIT="50"  # Max COACH accounts before manual approval required
NEXT_PUBLIC_COACH_LIMIT="50"   # Same, exposed to frontend

# Sentry
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""            # For source map uploads
```

---

## 20. Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Push schema to database (development)
npx prisma db push

# Or run migrations
npx prisma migrate dev

# Seed the database (54 ingredients)
npx prisma db seed

# Start development server
npm run dev

# Open Prisma Studio (DB GUI)
npx prisma studio
```

### Promote your account to ADMIN

```sql
-- In Supabase SQL Editor or psql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

This is a one-time operation to bootstrap the first admin. Subsequently, the superadmin panel handles role changes.

---

## 21. Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest src/__tests__/energy-engine.test.ts
```

### Test Coverage

30 tests covering the energy domain:

- BMR calculation for both sexes across age/weight/height ranges
- Mifflin-St Jeor formula accuracy
- Training kcal estimation (MET × weight × duration)
- TEF calculation for each macro
- Metabolic adaptation (factor updates up and down)
- Hydration target calculation
- Full engine integration tests (E_in, E_out, balance, ΔWeight)
- Edge cases: zero calories, extreme weights, missing data

The domain layer's purity (no external dependencies) makes these tests fast and deterministic — no mocking required.

---

## 22. Key Engineering Decisions

### Why `@db.Date` instead of `DateTime` for logs?

Daily logs are keyed by date, not datetime. Two log entries for "March 22" should map to the same record. Using `DateTime` would make equality checks timezone-dependent. `@db.Date` stores only the date component, making `findUnique` by `{ userId, date }` predictable regardless of when in the day it's queried.

Tradeoff: requires `toDateOnly()` everywhere a Date is constructed before querying.

### Why calculate nutrition dynamically instead of storing it?

Ingredient nutritional data could change (corrections, updated sources). Recipes reference ingredients — if an ingredient's `kcalPer100g` is corrected, all recipes using it automatically show the correct values without any migration. The computation is cheap enough that the overhead is negligible compared to the correctness guarantee.

### Why tRPC over REST for the main API?

End-to-end type safety without code generation. A `router.ts` change automatically propagates type errors to React Query hooks in the UI. This eliminates an entire category of bugs (wrong field names, missing fields, incorrect types) that would otherwise require manual interface synchronization.

### Why database sessions instead of JWT?

JWT sessions are stateless — you can't invalidate them server-side without a blocklist. Database sessions allow instant invalidation (e.g., when a subscription expires or a role changes). The tradeoff is one extra DB query per request for session validation, which is acceptable for this use case.

### Why `useMemo([], [])` for dates in queries?

React Query uses deep equality to detect when query inputs change. JavaScript `Date` objects compare by reference, not value — `new Date() !== new Date()` even for identical timestamps. Creating dates inside `useMemo([])` ensures the same object reference is used across all renders, preventing spurious refetches.

### Why the Coach/Client code split (RegistrationCode vs CoachInviteCode)?

`RegistrationCode` handles the **registration flow** — new users joining the platform with a pre-determined role and coach assignment. `CoachInviteCode` handles the **linking flow** — existing users connecting to a coach. Separating these prevents confusion about whether consuming a code creates an account or modifies an existing one.

---

## 23. Known Gotchas

### 1. `DEALLOCATE ALL` in Prisma logs

Supabase uses PgBouncer in transaction mode. PgBouncer resets prepared statements between connections, causing Prisma to see `DEALLOCATE ALL` before each query. This is normal and not an error.

### 2. NextAuth v5 role not appearing in session

The default `PrismaAdapter` only selects standard fields (`id`, `email`, `name`, `image`). Custom fields like `role` must be explicitly selected by overriding `getUser` and `getUserByEmail` in the adapter config. See `src/server/auth.ts`.

### 3. `useSession` requires `SessionProvider`

In Next.js App Router, `useSession` only works inside components wrapped by `<SessionProvider>`. In the T3 pattern, this wrapper goes in `src/app/layout.tsx`. Alternatively — and preferably — avoid `useSession` in dashboard components and read user data from `userProfile.getSummary` which includes `user.role` and `user.name`.

### 4. Recipe category type mismatch

The `Recipe.category` field was initially typed as `RecipeCategory` enum but later changed to `String?` in some migrations. If you see type errors around category, check that `schema.prisma` and the generated Prisma client are in sync (`npx prisma generate`).

### 5. QR payments require a POS/Store configuration in MercadoPago

The QR Dinámico endpoint requires `MP_STORE_ID`, `MP_POS_ID`, and `MP_USER_ID` to be configured in your MercadoPago account. If you don't have these, use `createPaymentLink` (Checkout Pro) instead — it works without store configuration.

### 6. MercadoPago webhook `external_reference` field

The `external_reference` field in MP's API maps to different places depending on payment type:
- For `preapproval` (subscriptions): it's the `userId` directly
- For `payment` (one-time): it's the `reference` from `PendingPayment` (format: `mytemple_{userId}_{plan}_{timestamp}`)

The webhook handler in `handleWebhook()` accounts for both patterns.

---

## Contributing

Before contributing, read `.cursor/rules/architecture.mdc`. It contains the enforceable constraints that any code contribution must respect. The most important: never mix layers, never store derived values, always use `db.$transaction()` for writes.
