import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { IngredientService } from "@/server/services/ingredient.service"

export const ingredientRouter = createTRPCRouter({
  
  // //   Catálogo completo con override del usuario mezclado.
  // //   Usado para el panel de gestión de ingredientes.
  // //  /
  getCatalog: protectedProcedure.query(async ({ ctx }) => {
    return IngredientService.getCatalogForUser(ctx.session.user.id)
  }),

 
   //Solo ingredientes activos — para el motor de recetas.
   
  getActive: protectedProcedure.query(async ({ ctx }) => {
    return IngredientService.getActiveForUser(ctx.session.user.id)
  }),

  // /
    // Actualiza el precio personalizado del usuario para un ingrediente.
    // null = volver al precio por defecto.
  //  /
  setCustomPrice: protectedProcedure
    .input(z.object({
      ingredientId: z.string().cuid(),
      customPricePerKg: z.number().positive().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      return IngredientService.setCustomPrice(
        ctx.session.user.id,
        input.ingredientId,
        input.customPricePerKg
      )
    }),

  // /
    // Activa o desactiva un ingrediente en el motor de recetas.
  //  /
  toggleActive: protectedProcedure
    .input(z.object({
      ingredientId: z.string().cuid(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      return IngredientService.toggleActive(
        ctx.session.user.id,
        input.ingredientId,
        input.isActive
      )
    }),

  // /
    // Elimina el override — precio y estado vuelven al valor por defecto.
  //  /
  resetOverride: protectedProcedure
    .input(z.object({ ingredientId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await IngredientService.resetOverride(
        ctx.session.user.id,
        input.ingredientId
      )
      return { success: true }
    }),

  // /
    // Un ingrediente con su override — para el panel de detalle.
  //  /
  getOne: protectedProcedure
    .input(z.object({ ingredientId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const ingredient = await IngredientService.getOne(
        ctx.session.user.id,
        input.ingredientId
      )
      if (!ingredient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ingrediente no encontrado" })
      }
      return ingredient
    }),
})
