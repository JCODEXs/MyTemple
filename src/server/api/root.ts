import { postRouter } from "@/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { dailyLogRouter } from "./routers/daily-log";
import { ingredientRouter } from "./routers/ingredient"
import { userProfileRouter } from "@/server/api/routers/user-profile"
import { workoutRouter } from "@/server/api/routers/workout"
import { recipeRouter } from "@/server/api/routers/recipe"
import { coachRouter } from "@/server/api/routers/coach"
import { nutritionPlanRouter } from "@/server/api/routers/nutrition-plan"
import { authRouter } from "@/server/api/routers/auth"
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  dailyLog:dailyLogRouter,
  ingredient:ingredientRouter,
  userProfile:userProfileRouter,
  workout:workoutRouter,
  recipe:recipeRouter,
  coach:coachRouter,
  nutritionPlan:nutritionPlanRouter,
  auth:authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
