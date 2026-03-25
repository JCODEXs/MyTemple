import { z }                                    from "zod"
import { createTRPCRouter, protectedProcedure, coachProcedure } from "@/server/api/trpc"
import { CommunicationsService }               from "@/server/services/communications.service"
import { PostType, PostVisibility }            from "@prisma/client"

const VALID_EMOJIS = ["❤️", "🔥", "🏆", "💪", "👏"] as const

export const communicationsRouter = createTRPCRouter({

  // ── Posts ──────────────────────────────────────────────────────────────────

  createPost: protectedProcedure
    .input(z.object({
      type:                z.nativeEnum(PostType),
      visibility:          z.nativeEnum(PostVisibility).default("PRIVATE"),
      content:             z.string().max(2000).optional(),
      imageUrls:           z.array(z.string().url()).max(6).optional(),
      recipeId:            z.string().cuid().optional(),
      planId:              z.string().cuid().optional(),
      challengeId:         z.string().cuid().optional(),
      attachDailyMetrics:  z.boolean().default(true),
    }))
    .mutation(({ ctx, input }) =>
      CommunicationsService.createPost(ctx.session.user.id, input)
    ),

  deletePost: protectedProcedure
    .input(z.object({ postId: z.string().cuid() }))
    .mutation(({ ctx, input }) =>
      CommunicationsService.deletePost(ctx.session.user.id, input.postId)
    ),

  featurePost: coachProcedure
    .input(z.object({ postId: z.string().cuid() }))
    .mutation(({ ctx, input }) =>
      CommunicationsService.featurePost(ctx.session.user.id, input.postId)
    ),

  // ── Feed ───────────────────────────────────────────────────────────────────

  getFeed: protectedProcedure
    .input(z.object({
      cursor:     z.string().optional(),
      limit:      z.number().int().min(1).max(50).default(20),
      visibility: z.nativeEnum(PostVisibility).optional(),
      userId:     z.string().cuid().optional(),
    }))
    .query(({ ctx, input }) =>
      CommunicationsService.getFeed(ctx.session.user.id, input)
    ),

  getUserPosts: protectedProcedure
    .input(z.object({ targetUserId: z.string().cuid() }))
    .query(({ ctx, input }) =>
      CommunicationsService.getUserPosts(ctx.session.user.id, input.targetUserId)
    ),

  // ── Reactions ──────────────────────────────────────────────────────────────

  toggleReaction: protectedProcedure
    .input(z.object({
      postId: z.string().cuid(),
      emoji:  z.enum(VALID_EMOJIS),
    }))
    .mutation(({ ctx, input }) =>
      CommunicationsService.toggleReaction(ctx.session.user.id, input.postId, input.emoji)
    ),

  // ── Comments ───────────────────────────────────────────────────────────────

  addComment: protectedProcedure
    .input(z.object({
      postId:   z.string().cuid(),
      content:  z.string().min(1).max(1000),
      parentId: z.string().cuid().optional(),
      imageUrl: z.string().url().optional(),
    }))
    .mutation(({ ctx, input }) =>
      CommunicationsService.addComment(ctx.session.user.id, input)
    ),

  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string().cuid() }))
    .mutation(({ ctx, input }) =>
      CommunicationsService.deleteComment(ctx.session.user.id, input.commentId)
    ),

  // ── Challenges ─────────────────────────────────────────────────────────────

 
getAvailableContacts: protectedProcedure
  .query(({ ctx }) =>
    CommunicationsService.getAvailableContacts(ctx.session.user.id)
  ),
 
// createChallenge ya debería existir — verificar que usa coachProcedure:
createChallenge: coachProcedure
  .input(z.object({
    title:       z.string().min(1).max(100),
    description: z.string().min(1).max(1000),
    imageUrl:    z.string().url().optional(),
    startsAt:    z.coerce.date(),
    endsAt:      z.coerce.date(),
    targetAll:   z.boolean().default(true),
    targetIds:   z.array(z.string().cuid()).optional(),
  }))
  .mutation(({ ctx, input }) =>
    CommunicationsService.createChallenge(ctx.session.user.id, input)
  ),

  getActiveChallenges: protectedProcedure
    .query(({ ctx }) =>
      CommunicationsService.getActiveChallenges(ctx.session.user.id)
    ),

  // ── Direct Messages ────────────────────────────────────────────────────────

  sendMessage: protectedProcedure
    .input(z.object({
      toId:     z.string().cuid(),
      content:  z.string().min(1).max(2000),
      imageUrl: z.string().url().optional(),
    }))
    .mutation(({ ctx, input }) =>
      CommunicationsService.sendMessage(ctx.session.user.id, input.toId, input)
    ),

  getConversation: protectedProcedure
    .input(z.object({ otherId: z.string().cuid() }))
    .query(({ ctx, input }) =>
      CommunicationsService.getConversation(ctx.session.user.id, input.otherId)
    ),

  getConversationList: protectedProcedure
    .query(({ ctx }) =>
      CommunicationsService.getConversationList(ctx.session.user.id)
    ),

  getUnreadCount: protectedProcedure
    .query(({ ctx }) =>
      CommunicationsService.getUnreadCount(ctx.session.user.id)
    ),
})
